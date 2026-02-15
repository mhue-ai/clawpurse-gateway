import { Request, Response, NextFunction } from 'express';

class ComplianceMiddleware {
  static validateDataProtection(req: Request, res: Response, next: NextFunction) {
    // Check for Personal Identifiable Information (PII) handling
    const sensitiveFields = ['email', 'password', 'socialSecurity'];
    
    sensitiveFields.forEach(field => {
      if (req.body[field]) {
        // Basic PII protection check
        if (!this.isDataProtectionCompliant(req.body[field], field)) {
          return res.status(400).json({ 
            error: 'Data does not meet compliance requirements',
            field: field
          });
        }
      }
    });

    next();
  }

  private static isDataProtectionCompliant(value: string, field: string): boolean {
    switch(field) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'password':
        // At least 8 characters, one uppercase, one lowercase, one number
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(value);
      default:
        return true;
    }
  }

  static auditTrail() {
    return (req: Request, res: Response, next: NextFunction) => {
      const auditEntry = {
        timestamp: new Date(),
        method: req.method,
        path: req.path,
        userId: (req as any).user?.id,
        ipAddress: req.ip
      };

      // In a real-world scenario, this would be logged to a secure audit database
      console.log('Compliance Audit:', JSON.stringify(auditEntry));

      next();
    };
  }

  static regionalComplianceCheck() {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRegion = req.get('X-Forwarded-For-Country');

      // Example compliance rules
      const restrictedRegions = ['North Korea', 'Iran'];

      if (userRegion && restrictedRegions.includes(userRegion)) {
        return res.status(403).json({ 
          error: 'Service not available in your region due to compliance restrictions' 
        });
      }

      next();
    };
  }
}

export default ComplianceMiddleware;
