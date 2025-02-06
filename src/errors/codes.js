/**
 * @file src/errors/codes.js
 * @description Агрегация кодов ошибок подсистем
 * @version 0.1.3
 */

// Импорт кодов ошибок из подсистем

/**
 * Коды ошибок всех подсистем
 *
 * @type {Object}
 */
export const ERROR_CODES = {
  // Общесистемные ошибки
  SYS: {
    INITIALIZATION_FAILED: {
      code: 'SYS_INIT_FAILED',
      message: 'System initialization failed: {reason}',
      subsystem: 'system',
      recoverable: false,
      docs: 'docs/errors/system.md#initialization-failed'
    },

    UNEXPECTED: {
      code: 'SYS_UNEXPECTED',
      message: 'Unexpected error occurred: {reason}',
      subsystem: 'system',
      recoverable: false,
      docs: 'docs/errors/system.md#unexpected'
    },

    VALIDATION_FAILED: {
      code: 'SYS_VALIDATION_FAILED',
      message: 'Validation failed: {reason}. Problems: {problemsText}',
      subsystem: 'system',
      recoverable: true,
      contextKeys: ['reason', 'problems', 'problemsText'],
      docs: 'docs/errors/system.md#validation-failed'
    },

    NOT_IMPLEMENTED: {
      code: 'SYS_NOT_IMPLEMENTED',
      message: 'Feature not implemented: {feature}',
      subsystem: 'system',
      recoverable: false,
      docs: 'docs/errors/system.md#not-implemented'
    },

    INVALID_ARGUMENT: {
      code: 'SYS_INVALID_ARGUMENT',
      message: 'Invalid argument {name}: {reason}',
      subsystem: 'system',
      recoverable: true,
      contextKeys: ['name', 'reason'],
      docs: 'docs/errors/system.md#invalid-argument'
    }
  }
}
