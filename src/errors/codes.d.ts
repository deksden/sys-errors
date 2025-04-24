/**
 * @file src/errors/codes.d.ts
 * @description TypeScript декларации для агрегированных кодов ошибок.
 * @version 0.1.3
 */

// Импортируем определение ошибки из главного файла деклараций
import { ErrorDefinition } from './errors'

/**
 * @interface SystemErrorCodes
 * @description Структура кодов ошибок для основной подсистемы 'system'.
 */
export interface SystemErrorCodes {
  INITIALIZATION_FAILED: ErrorDefinition;
  UNEXPECTED: ErrorDefinition;
  VALIDATION_FAILED: ErrorDefinition;
  NOT_IMPLEMENTED: ErrorDefinition;
  INVALID_ARGUMENT: ErrorDefinition;
}

/**
 * @interface AllErrorCodes
 * @description Общая структура для всех кодов ошибок, агрегированных из подсистем.
 */
export interface AllErrorCodes {
  SYS: SystemErrorCodes;
  // Здесь можно добавить другие подсистемы по мере их появления, например:
  // SYS_DB?: Record<string, ErrorDefinition>;
  // SYS_LOGGER?: Record<string, ErrorDefinition>;
}

/**
 * @const {AllErrorCodes} ERROR_CODES
 * @description Агрегированный объект, содержащий коды ошибок всех подсистем.
 * Служит центральной точкой доступа к определениям ошибок.
 */
export declare const ERROR_CODES: AllErrorCodes