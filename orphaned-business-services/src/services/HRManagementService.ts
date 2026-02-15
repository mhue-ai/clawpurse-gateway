
import crypto from "crypto";
import { EventEmitter } from "events";

class HRManagementService extends EventEmitter {
  private employees: Map<string, EmployeeProfile> = new Map();

  createEmployeeProfile(
    profileData: {
      firstName: string;
      lastName: string;
      email: string;
      department: string;
      position: string;
    }
  ): EmployeeProfile {
    const employee: EmployeeProfile = {
      id: crypto.randomUUID(),
      ...profileData,
      status: "active",
      hireDate: new Date()
    };

    this.employees.set(employee.id, employee);
    this.emit("employeeProfileCreated", employee);

    return employee;
  }
}

interface EmployeeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  status: "active" | "inactive" | "suspended";
  hireDate: Date;
}

export default HRManagementService;

