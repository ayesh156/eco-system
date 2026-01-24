/**
 * Input Sanitization and Validation Middleware
 * Based on OWASP API8:2023 - Security Misconfiguration
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { AppError } from './errorHandler';

// ===================================
// Validation Error Handler
// ===================================

/**
 * Middleware to check validation results and throw errors
 */
export const handleValidationErrors = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => {
      // Sanitize error messages - don't expose field paths for security
      if ('msg' in err) {
        return err.msg;
      }
      return 'Validation error';
    });
    throw new AppError(errorMessages.join('. '), 400);
  }
  next();
};

// ===================================
// Common Sanitization Functions
// ===================================

/**
 * Sanitize string input - removes dangerous characters
 */
const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key names to prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue; // Skip dangerous keys
    }
    sanitized[sanitizeString(key)] = sanitizeObject(value);
  }
  return sanitized;
};

/**
 * Global request body sanitization middleware
 */
export const sanitizeRequestBody = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// ===================================
// Common Validation Rules
// ===================================

/**
 * UUID validation
 */
export const validateUUID = (fieldName: string, location: 'params' | 'body' | 'query' = 'params'): ValidationChain => {
  const validator = location === 'params' ? param(fieldName) 
    : location === 'body' ? body(fieldName) 
    : query(fieldName);
  
  return validator
    .trim()
    .isUUID(4)
    .withMessage(`${fieldName} must be a valid UUID`);
};

/**
 * Email validation
 */
export const validateEmail = (fieldName: string = 'email'): ValidationChain => {
  return body(fieldName)
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters');
};

/**
 * Phone number validation (Sri Lankan format)
 */
export const validatePhone = (fieldName: string = 'phone'): ValidationChain => {
  return body(fieldName)
    .optional()
    .trim()
    .matches(/^(\+94|0)?[0-9]{9,10}$/)
    .withMessage('Please provide a valid phone number');
};

/**
 * Safe string validation - no special characters
 */
export const validateSafeString = (
  fieldName: string, 
  options: { min?: number; max?: number; required?: boolean } = {}
): ValidationChain => {
  const { min = 1, max = 255, required = true } = options;
  
  let validator = body(fieldName).trim();
  
  if (!required) {
    validator = validator.optional();
  } else {
    validator = validator.notEmpty().withMessage(`${fieldName} is required`);
  }
  
  return validator
    .isLength({ min, max })
    .withMessage(`${fieldName} must be between ${min} and ${max} characters`)
    .matches(/^[a-zA-Z0-9\s\-_.,!?'"()@#&+:;/\\[\]{}]*$/)
    .withMessage(`${fieldName} contains invalid characters`);
};

/**
 * Numeric validation
 */
export const validateNumber = (
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean } = {}
): ValidationChain => {
  const { min, max, required = true } = options;
  
  let validator = body(fieldName);
  
  if (!required) {
    validator = validator.optional();
  }
  
  validator = validator.isNumeric().withMessage(`${fieldName} must be a number`);
  
  if (min !== undefined) {
    validator = validator.isFloat({ min }).withMessage(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined) {
    validator = validator.isFloat({ max }).withMessage(`${fieldName} must not exceed ${max}`);
  }
  
  return validator;
};

/**
 * Currency amount validation
 */
export const validateCurrency = (fieldName: string, required: boolean = true): ValidationChain => {
  let validator = body(fieldName);
  
  if (!required) {
    validator = validator.optional();
  }
  
  return validator
    .isFloat({ min: 0, max: 999999999.99 })
    .withMessage(`${fieldName} must be a valid amount between 0 and 999,999,999.99`);
};

/**
 * Date validation
 */
export const validateDate = (fieldName: string, required: boolean = true): ValidationChain => {
  let validator = body(fieldName);
  
  if (!required) {
    validator = validator.optional();
  } else {
    validator = validator.notEmpty().withMessage(`${fieldName} is required`);
  }
  
  return validator
    .isISO8601()
    .withMessage(`${fieldName} must be a valid date in ISO 8601 format`);
};

/**
 * Pagination validation
 */
export const validatePagination = (): ValidationChain[] => [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a positive integer (max 10000)')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * Search query validation
 */
export const validateSearch = (): ValidationChain => {
  return query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters')
    .escape(); // HTML escape search terms
};

// ===================================
// Entity-Specific Validations
// ===================================

/**
 * Customer validation rules
 */
export const validateCustomer = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  validateEmail('email').optional(),
  validatePhone('phone'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  body('creditLimit')
    .optional()
    .isFloat({ min: 0, max: 10000000 })
    .withMessage('Credit limit must be between 0 and 10,000,000'),
  handleValidationErrors,
];

/**
 * Product validation rules
 */
export const validateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Name must be between 2 and 200 characters'),
  body('price')
    .isFloat({ min: 0, max: 999999999 })
    .withMessage('Price must be a positive number'),
  body('cost')
    .optional()
    .isFloat({ min: 0, max: 999999999 })
    .withMessage('Cost must be a positive number'),
  body('stock')
    .optional()
    .isInt({ min: 0, max: 999999 })
    .withMessage('Stock must be a positive integer'),
  body('minStock')
    .optional()
    .isInt({ min: 0, max: 999999 })
    .withMessage('Minimum stock must be a positive integer'),
  body('serialNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Serial number must not exceed 100 characters'),
  body('barcode')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Barcode must not exceed 50 characters'),
  handleValidationErrors,
];

/**
 * Shop registration validation rules
 */
export const validateShopRegistration = [
  body('shopName')
    .trim()
    .notEmpty()
    .withMessage('Shop name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Shop name must be between 2 and 100 characters'),
  body('adminName')
    .trim()
    .notEmpty()
    .withMessage('Admin name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Admin name must be between 2 and 100 characters'),
  validateEmail('adminEmail'),
  body('adminPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('phone')
    .optional()
    .matches(/^(\+94|0)?[0-9]{9,10}$/)
    .withMessage('Please provide a valid phone number'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  handleValidationErrors,
];

export default {
  handleValidationErrors,
  sanitizeRequestBody,
  sanitizeObject,
  validateUUID,
  validateEmail,
  validatePhone,
  validateSafeString,
  validateNumber,
  validateCurrency,
  validateDate,
  validatePagination,
  validateSearch,
  validateCustomer,
  validateProduct,
  validateShopRegistration,
};
