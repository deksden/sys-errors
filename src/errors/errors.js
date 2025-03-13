/**
 * @file src/errors/errors.js
 * @description Основной API подсистемы обработки ошибок SYS_ERRORS
 * @version 0.1.5
 */

import { SystemError } from './system-error.js'
import { ERROR_CODES } from './codes.js'

/**
 * Класс системной ошибки, расширяет стандартный Error
 * @typedef {Object} SystemError
 * @extends Error
 *
 * @property {string} code - Уникальный код ошибки (например, "SYS_VALIDATION_FAILED")
 * @property {string} message - Отформатированное сообщение об ошибке
 * @property {string} msg - Шаблон сообщения об ошибке (возможно, с ключами)
 * @property {string} subsystem - Подсистема, в которой произошла ошибка
 * @property {Object} context - Дополнительные данные об ошибке
 * @property {boolean} recoverable - Флаг возможности восстановления
 * @property {Error|SystemError} [original] - Исходная ошибка (для цепочки ошибок)
 * @property {string} [docs] - Ссылка на документацию по ошибке
 * @property {string} name - Имя класса ошибки ("SystemError")
 * @property {string} stack - Стек вызовов
 *
 * @method format - Возвращает форматированное представление ошибки со всей цепочкой
 * @returns {string} Форматированное представление ошибки
 *
 * @method toJSON - Сериализует ошибку для логирования
 * @returns {Object} Сериализованное представление ошибки
 */

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
 * Описание уровня в цепочке ошибок
 * @typedef {Object} ErrorChainLevel
 * @property {string} code - Ожидаемый код ошибки
 * @property {string} [type] - Ожидаемый тип/класс ошибки
 * @property {string|string[]} [message] - Фрагмент сообщения для поиска или массив ключевых слов
 */

/**
 * Проверяет цепочку ошибок
 * @param {SystemError} error - Проверяемая ошибка
 * @param {ErrorChainLevel[]} expectedChain - Ожидаемая цепочка
 * @returns {boolean} true если цепочка соответствует
 * @throws {Error} если цепочка не соответствует
 * @deterministic
 */
export function checkErrorChain (error, expectedChain) {
  let current = error
  let index = 0

  while (current && index < expectedChain.length) {
    const expected = expectedChain[index]

    // Проверяем код ошибки если указан
    if (expected.code && current.code !== expected.code) {
      throw new Error(`Unexpected error code at chain position ${index}. ` + `Expected: ${expected.code}, got: ${current.code}, "${current.message}"`)
    }

    // Проверяем тип если указан
    if (expected.type && current.constructor.name !== expected.type) {
      throw new Error(`Unexpected error type at chain position ${index}. ` + `Expected: ${expected.type}, got: ${current.constructor.name}, "${current.message}"`)
    }

    // Проверяем сообщение если указано
    if (expected.message) {
      // Убедимся что сообщение существует
      if (!current.message) {
        throw new Error(`Error at chain position ${index} does not have a message property\n` +
          `Error: ${JSON.stringify(current)}`)
      }

      const currentMessage = current.message.toLowerCase()
      // Если message - массив, проверяем каждое ключевое слово
      if (Array.isArray(expected.message)) {
        for (const keyword of expected.message) {
          if (!currentMessage.includes(keyword.toLowerCase())) {
            throw new Error(`Error message at chain position ${index} does not contain keyword: ${keyword}\n` + `Message: "${current.message}"`)
          }
        }
      } else {
        // Проверяем отдельное слово
        if (!currentMessage.includes(expected.message.toLowerCase())) {
          throw new Error(`Error message at chain position ${index} does not contain: ${expected.message}\n` + `Message: "${current.message}"`)
        }
      }
    }

    current = current.original
    index++
  }

  return true
}

// Реэкспорт базовых сущностей
export { SystemError } from './system-error.js'
export { ERROR_CODES } from './codes.js'
