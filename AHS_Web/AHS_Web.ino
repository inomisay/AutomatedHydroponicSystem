 // ******** LIBRARIES *********** //
#include <SoftwareSerial.h>                     // Allows serial communication on other digital pins of the Arduino, enabling multiple serial devices to be connected.
#include <EEPROM.h>                             // Provides functions to read and write data to the EEPROM, allowing persistent storage of data even after power is turned off.
#include "GravityTDS.h"                         // Manages the Total Dissolved Solids (TDS) sensor, used for measuring the concentration of dissolved solids in the solution.
#include <LiquidCrystal_I2C.h>                  // Controls an LCD display using the I2C protocol, simplifying the wiring and allowing multiple I2C devices to share the same bus.
#include <OneWire.h>                            // Enables communication with devices using the OneWire protocol, commonly used for digital temperature sensors like DS18B20.
#include <DallasTemperature.h>                  // Provides functions to read temperature from Dallas Semiconductor DS18B20 and similar temperature sensors.
#include <Wire.h>                               // Facilitates I2C communication between the Arduino and other I2C devices, serving as the foundation for I2C-related libraries.
#include <DHT.h>                                // Supports DHT sensors (e.g., DHT11, DHT22) for measuring humidity and temperature.
#include <RTClib.h>                             // Manages real-time clocks (RTCs) like the DS1307 or DS3231, allowing timekeeping functionality.
#include "pitches.h"  
// ******** Wi-Fi & Server credentials ******** //
String networkName = "FiberHGW_TP33DA_2.4GHz";  // The SSID (name) of the Wi-Fi network to which the device will connect.
String networkPassword = "c4KdPLD9";            // The password for the Wi-Fi network, required for authentication.
// ******** LCD ADDRESS ******** //
LiquidCrystal_I2C lcd(0x27, 16, 2);             // Initializes the LCD display with I2C address 0x27, 16 columns, and 2 rows.
// ******** PINS ******** //
#define TDS_SENSOR_PIN A1                       // Analog pin A1 is used to connect the TDS (Total Dissolved Solids) sensor.
#define ONE_WIRE_BUS 2                          // Digital pin 2 is used as the OneWire bus for connecting the DS18B20 temperature sensor.
#define DHT_PIN 7                               // Digital pin 7 is used to connect the DHT22 humidity and temperature sensor.
#define DHT_TYPE DHT22                          // Specifies that the type of DHT sensor being used is the DHT22 model.
#define PH_SENSOR_PIN A2                        // Analog pin A2 is used to connect the pH sensor.
#define WATER_LEVEL_SENSOR_PIN A3               // Analog pin A3 is used to connect the water level sensor.
#define BUZZER_PIN 9                            // Define the digital pin for the buzzer
// ******** VARIABLES ******** //
float wT;                                       // Water temperature, measured by the DS18B20 sensor (in degrees Celsius).
float tds = 0;                                  // Total Dissolved Solids (TDS) level in the water, measured by the TDS sensor (in ppm).
float h;                                        // Humidity level in the environment, measured by the DHT22 sensor (in percentage).
float eT = 25;                                  // Environment temperature, initially set to 25°C, measured by the DHT22 sensor.
float thresholdWL = 200;                        // Threshold water level value, used as a reference for comparing the current water level.
float wL = thresholdWL;                         // Current water level, initialized to the threshold value.
double pH = 0;                                  // pH level of the water, measured by the pH sensor.
// ******** Water Pump Direction ******** // LOW = OFF / HIGH = ON
int enA_1 = 5;                                  // Enable Normal Direction
int enA_2 = 6;                                  // Enable Reverse Direction
int pumpIn = 3;                                 // Normal Direction input 1
int pumpOut = 4;                                // Reverse Direction input 2
// ******** OBJECTS ******** //
GravityTDS gravityTds;                          // Creates an instance of the GravityTDS class for managing TDS sensor operations.
OneWire oneWire(ONE_WIRE_BUS);                  // Initializes the OneWire communication on the specified pin (ONE_WIRE_BUS) for use with OneWire devices like the DS18B20.
DallasTemperature sensors(&oneWire);            // Creates an instance of the DallasTemperature class to manage DS18B20 temperature sensors using the OneWire instance.
DeviceAddress tempSensorAddress;                // A variable to store the unique address of the DS18B20 temperature sensor.
DHT dht(DHT_PIN, DHT_TYPE);                     // Initializes the DHT22 sensor using the specified digital pin and sensor type (DHT22).
RTC_DS3231 myRTC;                               // Creates an instance of the RTC_DS3231 class for managing the DS3231 real-time clock module.
// ******** ESP8266 COMMUNICATION ******** //
SoftwareSerial esp(10, 11);                     // Creates a SoftwareSerial object for communication with the ESP8266 module. Pin 10 is used for TX (transmit) and pin 11 for RX (receive).
// ******** SETUP FUNCTIONS ******** //
void initializeESP8266() {
  // Initialize Serial communication for ESP8266
  esp.begin(115200);
  
  // Send AT command to check if ESP8266 is responding
  esp.println("AT");
  Serial.println("AT command sent");
  while (!esp.find("OK")) {
    esp.println("AT");
    Serial.println("ESP8266 Not found.");
  }
  Serial.println("OK command received");
  
  // Set ESP8266 to Client mode
  esp.println("AT+CWMODE=1");
  while (!esp.find("OK")) {
    esp.println("AT+CWMODE=1");
    Serial.println("Setting is being applied...");
  }
  Serial.println("Configured as a client");
  
  // Connect to Wi-Fi network
  Serial.println("Connecting to the network...");
  esp.println("AT+CWJAP=\"" + networkName + "\",\"" + networkPassword + "\"");

  // Timeout feature: Wait up to 5 minutes (300,000 milliseconds) for connection
  unsigned long startTime = millis();  // Record the start time
  while (!esp.find("OK")) {
    if (millis() - startTime > 300000) {  // Check if 5 minutes have passed
      Serial.println("Connection failed: Took too long to connect.");
      return;  // Exit the function if connection takes too long
    }
    // Optionally add a small delay to avoid overwhelming the ESP8266
    delay(1000); // Wait 1 second before retrying
  }

  Serial.println("Connected to the network.");
  delay(1000);  // Small delay to ensure the connection is fully established
}

void initializeRTC() { 
  // Initialize the Wire library for I2C communication
  Wire.begin();           
  delay(500);                                  // Small delay to ensure the I2C bus is ready

  Serial.println("Nano Ready!");               // Indicate that the Arduino Nano is ready

  // Initialize the RTC module
  if (!myRTC.begin()) {    
    Serial.println("Couldn't find RTC");       // Print an error message if the RTC module is not detected
    while (1);                                 // Halt execution if RTC is not found to prevent further errors
  }

  // Check if the RTC lost power and needs the time to be reset
  if (myRTC.lostPower()) { 
    Serial.println("RTC lost power, let's set the time!");  // Inform that the RTC lost power and time needs to be reset
    // Set the RTC time to the current compile time
    myRTC.adjust(DateTime(F(__DATE__), F(__TIME__)));       
  }
}

void initializeTDS() {
    gravityTds.setPin(TDS_SENSOR_PIN);          // Set the pin for the TDS sensor
    gravityTds.setAref(5.0);                    // Set the reference voltage on the ADC, default is 5.0V on Arduino UNO
    gravityTds.setAdcRange(1024);               // Set the ADC range: 1024 for 10-bit ADC, 4096 for 12-bit ADC
    gravityTds.begin();                         // Initialize the TDS sensor
}

// ******** SETUP ******** //
void setup() {
  Serial.begin(9600);                           // Initialize serial communication at 9600 baud rate
  Serial.println("Setup Started!");             // Print "Started" to indicate that the setup has begun

  // ***** ESP8266 ***** //
  initializeESP8266();                          // Initialize and configure the ESP8266 module for network communication

  // ***** RTC ***** //
  initializeRTC();                              // Initialize the RTC module for real-time clock functionality

  // ***** LCD ***** //
  lcd.begin(16, 2);                             // Initialize the LCD display with 16 columns and 2 rows
  lcd.backlight();                              // Turn on the LCD backlight
  lcd.clear();                                  // Clear any previous content on the LCD

  // ***** TDS ***** //
  initializeTDS();                              // Set up the TDS sensor for measuring Total Dissolved Solids in the water

  // ***** (L298N) WATER PUMP ACTIVATOR ***** //
  while (!Serial);                              // Wait for serial communication to start (used for debugging and ensuring readiness)
  
  // Set the pin connected to the water pump as an output
  pinMode(enA_2, OUTPUT);
  pinMode(pumpIn, OUTPUT);
  pinMode(pumpOut, OUTPUT);
  // Turn off motors - Initial state
  digitalWrite(pumpIn, LOW);
  digitalWrite(pumpOut, LOW);
  
  // ***** DS18B20 TEMPERATURE ***** //
  sensors.begin();                              // Initialize the DS18B20 temperature sensor

  // ***** DHT HUMIDITY AND TEMPERATURE ***** //
  Serial.begin(9600);                           // Reinitialize serial communication at 9600 baud rate (ensure it's available for debugging)
  dht.begin();                                  // Initialize the DHT sensor for humidity and temperature measurements
}

// ******** LOOP FUNCTIONS ******** //
double pHReading(int phSensorPin) {
  // Known voltage readings for calibration (measured in ADC values)
  int voltage_lemon = 66;      // Voltage reading from a lemon juice solution (pH 2.5)
  int voltage_distilled = 366; // Voltage reading from distilled water (pH 7.0)

  // Known pH values for calibration
  double pH_lemon = 2.5;       // pH value of the lemon juice solution
  double pH_distilled = 7.0;   // pH value of distilled water

  // Calculate slope and intercept for the linear regression equation
  double slope = (pH_distilled - pH_lemon) / (voltage_distilled - voltage_lemon);  // Slope of the calibration line
  double intercept = pH_lemon - (slope * voltage_lemon);                           // Y-intercept of the calibration line

  // Read the sensor voltage from the specified analog pin
  int voltage = analogRead(phSensorPin);  // Read the analog value from the pH sensor

  // Calculate the pH value using the regression equation
  double pH = (slope * voltage) + intercept;  // Apply the linear equation to determine the pH

  return pH;  // Return the calculated pH value
}

float TDSReading() {
  gravityTds.update();                        // Update the TDS sensor reading to get the latest data
  return gravityTds.getTdsValue();            // Retrieve and return the current TDS value from the sensor
}

float waterLevelReading(int sensorPin) {
  int value = analogRead(sensorPin);          // Read the raw analog value from the water level sensor
  return value * (500.0 / 1023.0);            // Convert the sensor value to millimeters based on the sensor's range
}

void waterPumpManagement(int waterLevelSensorPin, int pumpPin_1, int pumpPin_2, float thresholdWL) {
  // Read the current water level from the sensor
  float waterLevel = waterLevelReading(waterLevelSensorPin);

  // Set motors to maximum speed
  // For PWM maximum possible values are 0 to 255
  analogWrite(enA_1, 255);
  analogWrite(enA_2, 255);
  
  // Check if the water level is below the threshold
  if (waterLevel < thresholdWL) {
    lcd.setCursor(0, 0);                  // Set the cursor to the first row of the LCD
    lcd.print("Pump Activated");          // Display a message indicating the pump is activated
    lcd.setCursor(0, 1);                  // Set the cursor to the second row of the LCD
    lcd.print("Please Wait!");            // Display a message asking the user to wait

    // Activate the pump by setting the pin HIGH
    digitalWrite(pumpPin_1, HIGH);

    // Continuously check the water level until it reaches the threshold
    while (waterLevel < thresholdWL) {
      waterLevel = waterLevelReading(waterLevelSensorPin); // Update the water level reading
      delay(1000); // Delay for 1 second to avoid rapid polling and reduce sensor read frequency
    }
    
    // Deactivate the pump once the water level reaches or exceeds the threshold
    digitalWrite(pumpPin_1, LOW);
  } else {
    // If the water level is already above the threshold, ensure the pump is turned off
    digitalWrite(pumpPin_1, LOW);
  }

  delay(10000); // Delay for Stability of Water
  
  // Check if the water level is above the threshold
  if (waterLevel > thresholdWL) {
    lcd.setCursor(0, 0);                  // Set the cursor to the first row of the LCD
    lcd.print("Pump Activated");          // Display a message indicating the pump is activated
    lcd.setCursor(0, 1);                  // Set the cursor to the second row of the LCD
    lcd.print("Please Wait!");            // Display a message asking the user to wait

    // Activate the pump by setting the pin HIGH
    digitalWrite(pumpPin_2, HIGH);
    
    // Continuously check the water level until it reaches the threshold
    while (waterLevel > thresholdWL) {
      waterLevel = waterLevelReading(waterLevelSensorPin); // Update the water level reading
      delay(1000); // Delay for 1 second to avoid rapid polling and reduce sensor read frequency
    }
    
    // Deactivate the pump once the water level reaches or exceeds the threshold
    digitalWrite(pumpPin_2, LOW);
  } else {
    // If the water level is already above the threshold, ensure the pump is turned off
    digitalWrite(pumpPin_2, LOW);
  }
}

void displayDataOnLCD(DateTime now, float wT, float eT, float h, float tds, float pH, float wL, int wValue) {
    for (int i = 0; i < 4; i++) {
    lcd.clear();
    if (i == 0) { // Time and Date
      lcd.setCursor(0, 0);            lcd.print("Time: "); 
      lcd.print(now.hour(), DEC);     lcd.print(':');                  
      lcd.print(now.minute(), DEC);   lcd.print(':');                  
      lcd.print(now.second(), DEC);    
      lcd.setCursor(0, 1);            lcd.print("Date: ");             
      lcd.print(now.year(), DEC);     lcd.print('/');
      lcd.print(now.month(), DEC);    lcd.print('/');                  
      lcd.print(now.day(), DEC);      
      delay(5000);
    }
    else if (i == 1) { // TDS and pH
      lcd.setCursor(0, 0);    lcd.print("TDS: ");
      lcd.print(tds);         lcd.print(" ppm       ");
      lcd.setCursor(0, 1);    lcd.print("pH: ");              
      lcd.print(pH);                 
      delay(5000);
    }
    else if (i == 2) { // Temperature
      if (wT != DEVICE_DISCONNECTED_C)
      {
        lcd.setCursor(0, 0);    lcd.print("Water T: ");        
        lcd.print(wT);          lcd.print((char)223);
        lcd.print("C");                
        lcd.setCursor(0, 1);    lcd.print("H:");
        lcd.print(h);           lcd.print("%");               
        lcd.setCursor(9, 1);    lcd.print("T:");              
        lcd.print(eT);          lcd.print((char)223);         
        lcd.print("C");               
        delay(5000);
      }
    }
    else if (i == 3) { // Water Level
      lcd.setCursor(0, 0);    lcd.print("Value: ");           
      lcd.print(wL);          lcd.print(" mm   ");           
      lcd.setCursor(0, 1);    lcd.print("W. Level: ");       
      if (wValue == 0) { lcd.print("EMPTY "); } 
      else if (wValue > 1 && wValue < 100) { lcd.print("LOW   "); } 
      else if (wValue > 100 && wValue < 200) { lcd.print("MEDIUM"); } 
      else if (wValue > 200) { lcd.print("HIGH  "); }
    }
  }
}

// ******** LOOP ******** //
void loop() {
    // Initialize connection to the server
    if (esp.find("Error")) {                                    
      Serial.println("AT+CIPSTART Error"); // Print an error message if connection to the server fails
    }
  
    // Get current time from RTC
    DateTime now = myRTC.now(); // Retrieve the current date and time from the RTC module

    // Read pH value from the pH sensor
    pH = pHReading(PH_SENSOR_PIN);
    
    // Read TDS value from the TDS sensor
    tds = TDSReading();

    // Read water level from the water level sensor
    int wValue = analogRead(WATER_LEVEL_SENSOR_PIN);
    wL = waterLevelReading(WATER_LEVEL_SENSOR_PIN);
    // PUMP THE WATER INSIDE THE BUCKET VS PUMP THE WATER OUTSIDE THE BUCKET
    //waterPumpManagement(WATER_LEVEL_SENSOR_PIN, pumpIn, pumpOut, thresholdWL); // Manage the water pump based on water level 
  
    // Request temperature readings from DS18B20 sensor
    sensors.requestTemperatures();
    wT = sensors.getTempCByIndex(0); // Get the temperature in Celsius from the DS18B20 sensor

    // Read humidity and temperature from DHT sensor
    h = (float) dht.readHumidity();      // Read and cast humidity value to float
    eT = (float) dht.readTemperature();  // Read and cast temperature value to float

    // Print the data to the Serial Monitor
    Serial.print("Date: ");
    Serial.print(now.day() < 10 ? "0" : "");
    Serial.print(now.day());
    Serial.print("/");
    Serial.print(now.month() < 10 ? "0" : "");
    Serial.print(now.month());
    Serial.print("/");
    Serial.println(now.year()); 

    Serial.print("Time: ");
    Serial.print(now.hour() < 10 ? "0" : "");
    Serial.print(now.hour());
    Serial.print(":");
    Serial.print(now.minute() < 10 ? "0" : "");
    Serial.print(now.minute());
    Serial.print(":");
    Serial.print(now.second() < 10 ? "0" : "");
    Serial.println(now.second());
    
    Serial.print("Water Temperature: ");
    Serial.println(wT);
    
    Serial.print("TDS: ");
    Serial.println(tds);
    
    Serial.print("Humidity: ");
    Serial.println(h);
    
    Serial.print("Environment Temperature: ");
    Serial.println(eT);
    wL = 250;
    Serial.print("Water Level: ");
    Serial.println(wL);
    
    Serial.print("pH: ");
    Serial.println(pH);

    displayDataOnLCD(now, wT, eT, h, tds, pH, wL, wValue); // Update LCD with the current sensor readings
    
    // Delay before the next loop iteration
    delay(1800000); // Wait for 30 minute (1800000 milliseconds) before running the loop again
}
