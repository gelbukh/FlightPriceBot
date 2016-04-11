var fs = require("fs");
var TelegramBot = require("node-telegram-bot-api");
var airports = require("airport-codes");

var token = fs.readFileSync("token.txt", "utf8");
var token_aero = fs.readFileSync("token_aero.txt", "utf8");
var bot = new TelegramBot(token, {polling: true});

function zeroPad(num, places)
{
	var zero = places - num.toString().length + 1;
	return Array(+(zero > 0 && zero)).join("0") + num;
}

bot.onText(/^([a-zA-Z -]+)$/, function (msg, match)
{
	var fromId = msg.from.id;

	var requestify = require("requestify");

	var inputs = match[1].split(" ");

	if (inputs.length != 2)
	{
		bot.sendMessage(fromId, "Enter city names or IATA codes separated by space (e.g. 'MOW NYC' or 'Moscow New-York')");
	}
	
	else
	{
		var origin_iata = inputs[0];
		var destination_iata = inputs[1];
		
		var new_origin_iata = 0;
		var new_destination_iata = 0;

		for (i = 0;typeof airports.at(i) != "undefined";i++)
		{
			if (origin_iata.toLowerCase().replace(/-/g , " ") == airports.at(i).get("city").toLowerCase() && airports.at(i).get("iata"))
			{
				new_origin_iata = airports.at(i).get("iata");
			}
			
			if (destination_iata.toLowerCase().replace(/-/g , " ") == airports.at(i).get("city").toLowerCase() && airports.at(i).get("iata"))
			{
				new_destination_iata = airports.at(i).get("iata");
			}
		}
		
		if (new_origin_iata)
		{
			origin_iata = new_origin_iata;
		}
		
		if (new_destination_iata)
		{
			destination_iata = new_destination_iata;
		}
		
		if (origin_iata.length != 3)
		{
			bot.sendMessage(fromId, "Unknown IATA code: "+origin_iata);
		}
		
		else if (destination_iata.length != 3)
		{
			bot.sendMessage(fromId, "Unknown IATA code: "+destination_iata);
		}
		
		else
		{
			origin_iata      = origin_iata.toUpperCase();
			destination_iata = destination_iata.toUpperCase();
			
			fs.appendFile("log.txt", fromId+" (@"+msg.from.username+") requested data for "+origin_iata+"-"+destination_iata+"\n", function (err) {});
			
			var date = new Date();
			
			var str = "";

			str += "✈️ Prices for "+origin_iata+"-"+destination_iata+":\n\n";

			requestify.get('http://api.travelpayouts.com/v1/prices/calendar?depart_date=' + date.getFullYear() + '-' + zeroPad(date.getMonth()+1, 2) + '&origin=' + origin_iata + '&destination=' + destination_iata + '&calendar_type=departure_date&currency=usd&token='+token_aero)
			.then(function(response)
			{
				var bod = JSON.parse(response.body);
				
				if (bod.success)
				{
					var sum = 0;

					var start_date = Object.keys(bod.data)[0];
					var min_price = bod.data[Object.keys(bod.data)[0]].price;
					var max_price = bod.data[Object.keys(bod.data)[0]].price;

					for (i = 0; i < Object.keys(bod.data).length; i++)
					{
						sum = sum + bod.data[Object.keys(bod.data)[i]].price;
	
						if (bod.data[Object.keys(bod.data)[i]].price < min_price)
						{
							min_price = bod.data[Object.keys(bod.data)[i]].price;
						}
							
						if (bod.data[Object.keys(bod.data)[i]].price > max_price)
						{
							max_price = bod.data[Object.keys(bod.data)[i]].price;
						}
							
						var final_date = Object.keys(bod.data)[i];
					}
						
					str += "⬇️ Minimum price: "+min_price+" USD\n↕️ AVERAGE PRICE: " + Math.floor(sum/Object.keys(bod.data).length) + " USD\n⬆️ Maximum price: "+max_price+" USD";
					
					str += "\n\n📅 Data exact for "+start_date.split("-")[2]+"."+start_date.split("-")[1]+" - "+final_date.split("-")[2]+"."+final_date.split("-")[1]+"\n";
					
					bot.sendMessage(fromId, str);
				}
				
				else
				{
					bot.sendMessage(fromId, "An error has occured! Please contact bot owner (@gelbukh).");
				}
			}
			);
		}
	}
});

bot.onText(/^\/start/, function (msg, match)
{
	var fromId = msg.from.id;

	bot.sendMessage(fromId, "Enter city names or IATA codes separated by space (e.g. 'MOW NYC' or 'Moscow New-York')");
});

bot.onText(/^\/help/, function (msg, match)
{
	var fromId = msg.from.id;

	bot.sendMessage(fromId, "Enter city names or IATA codes separated by space (e.g. 'MOW NYC' or 'Moscow New-York')");
});

bot.onText(/^\/about/, function (msg, match)
{
	var fromId = msg.from.id;

	bot.sendMessage(fromId, "Bot created in 2016 by @gelbukh using 'airport-codes' package and travelpayouts.com API. License: GNU GPL.\n\nFork on GitHub: https://github.com/gelbukh/FlightPriceBot");
});