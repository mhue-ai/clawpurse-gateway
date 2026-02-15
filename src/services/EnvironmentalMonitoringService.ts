
import crypto from "crypto";
import { EventEmitter } from "events";

class EnvironmentalMonitoringService extends EventEmitter {
  private sensors: Map<string, EnvironmentalSensor> = new Map();
  private readings: Map<string, EnvironmentalReading[]> = new Map();

  registerSensor(sensorData: {
    name: string;
    type: "air_quality" | "water_quality" | "soil_health";
    location: {
      latitude: number;
      longitude: number;
    };
  }): EnvironmentalSensor {
    const sensor: EnvironmentalSensor = {
      id: crypto.randomUUID(),
      ...sensorData,
      status: "active",
      registeredAt: new Date()
    };

    this.sensors.set(sensor.id, sensor);
    this.emit("sensorRegistered", sensor);

    return sensor;
  }
}

interface EnvironmentalSensor {
  id: string;
  name: string;
  type: "air_quality" | "water_quality" | "soil_health";
  location: {
    latitude: number;
    longitude: number;
  };
  status: "active" | "inactive";
  registeredAt: Date;
}

interface EnvironmentalReading {
  id: string;
  sensorId: string;
  parameter: string;
  value: number;
  unit: string;
  timestamp: Date;
}

export default EnvironmentalMonitoringService;

