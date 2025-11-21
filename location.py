from flask import Flask, request, render_template_string
from geopy.geocoders import Nominatim

app = Flask(__name__)

# HTML template served directly for demo
HTML_PAGE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPS Location Test</title>
    <style>
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(120deg, #007BFF, #00C6FF);
            color: white;
            text-align: center;
            padding: 40px;
        }
        button {
            background: white;
            color: #007BFF;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: 0.3s;
        }
        button:hover {
            background: #f0f0f0;
        }
        #output {
            margin-top: 20px;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <h2>🌍 Get My Current Location</h2>
    <p>Click the button below to allow access to your location.</p>
    <button onclick="getLocation()">📍 Get Location</button>
    <div id="output"></div>

    <script>
        function getLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(success, error);
            } else {
                document.getElementById("output").innerHTML = "Geolocation not supported by your browser.";
            }
        }

        function success(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            document.getElementById("output").innerHTML = 
                `Latitude: ${lat}<br>Longitude: ${lon}<br>Sending to server...`;

            fetch("/update_location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ latitude: lat, longitude: lon })
            })
            .then(res => res.json())
            .then(data => {
                document.getElementById("output").innerHTML += 
                    `<br><br><strong>Detected Address:</strong><br>${data.address}`;
            })
            .catch(err => {
                document.getElementById("output").innerHTML += "<br>Error sending data.";
                console.error(err);
            });
        }

        function error(err) {
            document.getElementById("output").innerHTML = 
                `Error getting location: ${err.message}`;
        }
    </script>
</body>
</html>
"""

@app.route("/")
def home():
    return render_template_string(HTML_PAGE)

@app.route("/update_location", methods=["POST"])
def update_location():
    data = request.get_json()
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    # Use geopy to convert lat/lon → address
    geolocator = Nominatim(user_agent="gps_tester")
    location = geolocator.reverse((latitude, longitude), language="en")

    address = location.address if location else "Unable to determine address."
    print(f"📍 User Location: {latitude}, {longitude}")
    print(f"🗺 Address: {address}")

    return {"status": "success", "address": address}

if __name__ == "__main__":
    app.run(debug=True,port=5000)


# pip install flask geopy