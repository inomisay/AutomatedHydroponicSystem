using System;
using System.IO.Ports;
using MongoDB.Bson;
using MongoDB.Driver;

class Program
{
    static void Main(string[] args)
    {
        // Serial port configuration
        // Top Right Port : /dev/cu.usbmodem14101
        // Down Right Port:
        // Top Left Port: /dev/cu.usbmodem14401
        // Down Left Port: /dev/cu.usbmodem14601
        string portName = "/dev/cu.usbmodem14601";
        int baudRate = 9600;

        SerialPort serialPort = new SerialPort(portName, baudRate);

        // MongoDB connection setup
        string connectionString = "mongodb+srv://jmvshp:sg7OvA0yetgIX5GX@cluster0.75bo5zs.mongodb.net/";
        var client = new MongoClient(connectionString);
        var database = client.GetDatabase("AHS_DB");
        var collection = database.GetCollection<SensorData>("SensorReadings");
        var statusCollection = database.GetCollection<SensorStatus>("SensorStatus");

        try
        {
            serialPort.Open();

            if (serialPort.IsOpen)
            {
                Console.WriteLine("Connected to Arduino on " + portName);

                var sensorData = new SensorData();

                while (true)
                {
                    try
                    {
                        string data = serialPort.ReadLine();
                        Console.WriteLine("Data from Arduino: " + data);

                        // Parse the data and update the sensorData object
                        ParseSensorData(data, sensorData);

                        // Check if all fields are populated and store status
                        var sensorStatus = new SensorStatus
                        {
                            StatusDate = DateTime.Now,
                            WaterTemperatureStatus = CheckStatus(sensorData.WaterTemperature),
                            TDSStatus = CheckStatus(sensorData.TDS),
                            HumidityStatus = CheckStatus(sensorData.Humidity),
                            EnvironmentTemperatureStatus = CheckStatus(sensorData.EnvironmentTemperature),
                            WaterLevelStatus = CheckStatus(sensorData.WaterLevel),
                            PHStatus = CheckStatus(sensorData.PH)
                        };

                        statusCollection.InsertOne(sensorStatus);

                        if (IsSensorDataComplete(sensorData))
                        {
                            // Save data to MongoDB
                            collection.InsertOne(sensorData);
                            Console.WriteLine("**********************************");
                            Console.WriteLine("Data saved to MongoDB.");
                            Console.WriteLine("**********************************");

                            // Reset sensorData for the next set of readings
                            sensorData = new SensorData();
                        }
                    }
                    catch (FormatException fe)
                    {
                        Console.WriteLine("Data format error: " + fe.Message);
                    }
                    Console.WriteLine("----------------------------------");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
        }
        finally
        {
            if (serialPort.IsOpen)
            {
                serialPort.Close();
            }
        }
    }

    private static void ParseSensorData(string data, SensorData sensorData)
    {
        var keyValuePattern = new System.Text.RegularExpressions.Regex(@"^(\w[\w\s]+):\s*(.*)$");
        var match = keyValuePattern.Match(data);

        if (match.Success)
        {
            string key = match.Groups[1].Value.Trim();
            string value = match.Groups[2].Value.Trim();

            switch (key)
            {
                case "Date":
                    sensorData.Date = string.IsNullOrEmpty(value) ? null : value;
                    break;
                case "Time":
                    sensorData.Time = string.IsNullOrEmpty(value) ? null : value;
                    break;
                case "Water Temperature":
                    sensorData.WaterTemperature = string.IsNullOrEmpty(value) ? 0 : Convert.ToDouble(value);
                    break;
                case "TDS":
                    sensorData.TDS = string.IsNullOrEmpty(value) ? 0 : Convert.ToDouble(value);
                    break;
                case "Humidity":
                    sensorData.Humidity = string.IsNullOrEmpty(value) ? 0 : Convert.ToDouble(value);
                    break;
                case "Environment Temperature":
                    sensorData.EnvironmentTemperature = string.IsNullOrEmpty(value) ? 0 : Convert.ToDouble(value);
                    break;
                case "Water Level":
                    sensorData.WaterLevel = string.IsNullOrEmpty(value) ? 0 : Convert.ToDouble(value);
                    break;
                case "pH":
                    sensorData.PH = string.IsNullOrEmpty(value) ? 0 : Convert.ToDouble(value);
                    break;
                default:
                    Console.WriteLine("Unknown key: " + key);
                    break;
            }
        }
    }

    private static bool IsSensorDataComplete(SensorData sensorData)
    {
        // Check if all required fields are populated
        return !string.IsNullOrEmpty(sensorData.Date) && !string.IsNullOrEmpty(sensorData.Time) &&
               sensorData.WaterTemperature != 0 && sensorData.TDS != 0 && sensorData.Humidity != 0 &&
               sensorData.EnvironmentTemperature != 0 && sensorData.WaterLevel != 0 && sensorData.PH != 0;
    }
    private static string CheckStatus(double value)
    {
        if (double.IsNaN(value) || value == 0)
        {
            return "Offline";
        }
        return "Online";
    }
}

public class SensorData
{
    public ObjectId Id { get; set; }
    public string? Date { get; set; }  // Nullable
    public string? Time { get; set; }  // Nullable
    public double WaterTemperature { get; set; }
    public double EnvironmentTemperature { get; set; }
    public double Humidity { get; set; }
    public double WaterLevel { get; set; }
    public double TDS { get; set; }
    public double PH { get; set; }
}

public class SensorStatus
{
    public ObjectId Id { get; set; }
    public DateTime StatusDate { get; set; }
    public string WaterTemperatureStatus { get; set; } = "Unknown";  // Default value
    public string TDSStatus { get; set; } = "Unknown";  // Default value
    public string HumidityStatus { get; set; } = "Unknown";  // Default value
    public string EnvironmentTemperatureStatus { get; set; } = "Unknown";  // Default value
    public string WaterLevelStatus { get; set; } = "Unknown";  // Default value
    public string PHStatus { get; set; } = "Unknown";  // Default value
}