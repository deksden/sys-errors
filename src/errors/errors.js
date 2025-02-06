/**
 * @file src/errors/errors.js
 * @description Основной API подсистемы обработки ошибок SYS_ERRORS
 * @version 0.1.3
 */

import { SystemError } from './system-error.js'
import { ERROR_CODES } from './codes.js'

/**
 * Зависимости модуля
 */
export const dependencies = {
  SystemError,
  ERROR_CODES
}

/**
 * Устанавливает зависимости модуля
 * @param {Partial<typeof dependencies>} newDependencies - Новые зависимости
 */
export function setDependencies (newDependencies) {
  Object.assign(dependencies, newDependencies)
}

/**
 * Форматирует сообщение об ошибке с подстановкой контекста
 *
 * Основная ответственность:
 * - Подстановка значений из контекста в шаблон
 * - Обработка отсутствующих значений
 * - Экранирование спецсимволов
 * - Корректная обработка undefined значений
 *
 * @param {string} template - Шаблон сообщения с {placeholders}
 * @param {Object} [context] - Значения для подстановки
 * @returns {string} Отформатированное сообщение
 */
export function formatMessage (template, context = {}) {
  if (template === undefined) {
    return ''
  }
  return template.replace(/{(\w+)}/g, (match, key) => {
    const value = context[key]
    if (value === undefined) {
      return match
    }
    return value?.toString() ?? match
  })
}

/**
 * Проверяет валидность определения ошибки
 *
 * Основная ответственность:
 * - Проверка обязательных полей определения
 * - Валидация формата полей
 * - Сбор списка проблем
 *
 * @param {Object} definition - Проверяемое определение
 * @returns {string[]} Список найденных проблем
 */
export function validateDefinition (definition) {
  const problems = []

  if (!definition?.code) {
    problems.push('Missing error code')
  }
  if (!definition?.message) {
    problems.push('Missing error message')
  }
  if (definition?.code && !/^[A-Z][A-Z0-9_]*$/.test(definition.code)) {
    problems.push('Invalid error code format')
  }

  return problems
}

/**
 * Создает системную ошибку
 *
 * Основная ответственность:
 * - Создание ошибки с метаданными
 * - Валидация входных параметров
 * - Обработка некорректных входных данных
 * - Формирование информативного сообщения
 *
 * @param {Object} errorDefinition - Определение ошибки из ERROR_CODES
 * @param {Object} [context] - Контекст ошибки
 * @param {Error} [originalError] - Исходная ошибка
 * @param {Object} [options] - Опции создания ошибки
 * @param {boolean} [options.strict=true] - Строгий режим валидации
 * @returns {SystemError} Системная ошибка
 * @throws {SystemError} При некорректных входных данных в строгом режиме
 */
export function createError (errorDefinition, context, originalError, options) {
  const { SystemError, ERROR_CODES } = dependencies

  // Режим валидации
  const strict = options?.strict ?? process.env.NODE_ENV !== 'production'

  // Валидация определения в строгом режиме
  if (strict) {
    const problems = validateDefinition(errorDefinition)
    if (problems.length > 0) {
      return new SystemError(
        ERROR_CODES.SYS.VALIDATION_FAILED,
        {
          reason: 'Invalid error definition',
          problems,
          problemsText: problems.join(', ')
        },
        originalError
      )
    }
  }

  try {
    return new SystemError(
      errorDefinition,
      context,
      originalError,
      options
    )
  } catch (error) {
    // При любых других ошибках создания SystemError
    return new SystemError(
      ERROR_CODES.SYSTEM.UNEXPECTED,
      {
        reason: error.message || 'Failed to create system error'
      },
      error
    )
  }
}

/**
 * Проверяет что ошибка определенного типа
 *
 * Основная ответственность:
 * - Определение типа ошибки
 * - Проверка кода ошибки
 * - Поддержка иерархии ошибок
 *
 * @param {Error} error - Проверяемая ошибка
 * @param {Object} errorDefinition - Определение ошибки из ERROR_CODES
 * @returns {boolean} true если ошибка соответствует определению
 */
export function isError (error, errorDefinition) {
  return error instanceof SystemError &&
    error.code === errorDefinition?.code
}

// Реэкспорт базовых сущностей
export { SystemError } from './system-error.js'
export { ERROR_CODES } from './codes.js'
