# Automated Hydroponic System Using Arduino

## 📌 Overview  
This project aims to develop an **automated hydroponic system** using an **Arduino-based experimental setup** to monitor and control key environmental parameters such as **temperature, humidity, pH, and water level**. The system follows the **Deep Water Culture (DWC) technique**, ensuring optimal plant growth through real-time data collection and automated adjustments.  

## 🎯 Project Objective  
The primary goal is to design, build, and implement a hydroponic system that:  
- ✅ Automates environmental monitoring & control  
- ✅ Provides real-time monitoring via an LCD display  
- ✅ Saves time and space, reducing manual labor  
- ✅ Ensures optimal growing conditions for plants  
- ✅ Sends data to a server for record-keeping via Wi-Fi  

## ⚙️ System Overview  
The system consists of a **DWC hydroponic setup** where plant roots are suspended in a **nutrient-rich, oxygenated solution**. Key **sensors** and **controllers** are integrated with an Arduino board, allowing **automated adjustments** to environmental conditions.  

### 🔹 Key Features  
- 📊 Real-time monitoring of **temperature, humidity, pH, water level, and nutrient quality**  
- 🤖 Automated **nutrient and water delivery system**  
- 📡 Remote monitoring via an **ESP8266 Wi-Fi module**  
- 🖥️ LCD display for **local monitoring**  
- 📱 **Android app integration** for remote access  

---

## 🛠️ Components & Materials  

### 🔌 **Electronics & Sensors**  
- Arduino Board  
- ESP8266 Wi-Fi Module  
- DHT22 Temperature & Humidity Sensor  
- DS18B20 Temperature Sensor  
- Arduino pH Sensor  
- Gravity: Non-Contact Digital Water Level Sensor  
- Arduino TDS Liquid Conductivity and Quality Sensor  
- DS3231 Real-Time Clock Module  

### ⚙️ **Mechanical & Power Components**  
- 12V Relay Switch (4 Channels)  
- 12V Peristaltic Liquid Pump  
- 12V Aquarium Air Pump  
- Aquarium Air Stone  
- Plastic Bucket (Reservoir for Nutrient Solution)  
- Net Pots for DWC System  
- Pumice Stones  
- Lightbulb  

### 🖥 **Display & Control**  
- LCD Module (2x16)  
- Push Button  
- Resistors  

---

## 🏗️ System Design & Automation  
💡 **Hydroponic Setup**: The **DWC drip system** supplies nutrients and oxygen to plant roots, ensuring healthy growth.  
💡 **Automated Control**: The Arduino continuously monitors sensors and triggers adjustments when necessary.  
💡 **Wi-Fi Monitoring**: Sensor data is sent to a **server via Wi-Fi**, allowing remote access.  
💡 **LCD Display**: Real-time environmental readings are displayed for local monitoring.  

---

## 📈 Expected Outcomes  
- 🌱 Fully functional **automated hydroponic system**  
- 📉 **Reduced manual labor** and improved efficiency  
- 📊 **Real-time monitoring** and control capabilities  
- 🚀 Higher plant yields with minimal intervention  
- 🔄 Scalable for **home gardens & commercial applications**  

---

## 🛠️ Challenges & Future Improvements  

### ⚠️ Challenges  
- 🔹 Integration of hardware components with Arduino code was **challenging**  
- 🔹 Ensuring **smooth real-time adjustments** required extensive testing  

### 🚀 Future Improvements  
- ✅ Expand remote monitoring to a **web-based platform**  
- ✅ Enhance user interface for better control  
- ✅ Add **machine learning** to optimize nutrient delivery  

---


## 🏃‍♂️ How to Run the Project

This project includes two backend servers: one built with **Node.js** and one with **.NET (C#)**.

### 🚀 Node.js Server
1. Open a terminal in the project root directory.
2. Install dependencies:
	```sh
	npm install
	```
3. Start the Node.js server (use `npx` if nodemon is not installed globally):
	```sh
	npx nodemon server.js
	```
	or
	```sh
	npm start
	```
4. The server will run at [http://localhost:8080](http://localhost:8080) by default.

### 🚀 .NET (C#) Server
1. Open a terminal and navigate to the `DataRetrival` directory:
	```sh
	cd DataRetrival
	```
2. Build the project:
	```sh
	dotnet build
	```
3. Run the .NET server:
	```sh
	dotnet run
	```
4. The .NET server will run according to the configuration in `DataRetrival.csproj`.

---
1️⃣ **Set up the hardware** by assembling the sensors, relays, and pumps.  
2️⃣ **Flash the Arduino code** onto the board.  
3️⃣ **Connect the ESP8266 Wi-Fi module** for data transmission.  
4️⃣ **Power the system** and monitor sensor data on the LCD screen.  
5️⃣ **Use the Android app** for remote monitoring.  

---

## ✨ Contributors  
👩‍💻 **Yasamin Valishariatpanahi** – Project Development & Implementation - Web Application Development & Database Data Retrieval
👩‍💻 **İlhan Gamze Saygı** – Project Development & Implementation
👩‍💻 **Sara Mahyanbakhshayesh** – Project Development & Implementation

---

## 📜 License  
This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.  

---

## 📬 Contact  
For any questions or contributions, feel free to reach out! 🚀  
