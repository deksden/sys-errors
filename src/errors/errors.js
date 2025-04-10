/**
 * @file src/errors/errors.js
 * @description Основной API подсистемы обработки ошибок SYS_ERRORS
 * @version 0.1.8
 */

import { SystemError } from './system-error.js'
import { ERROR_CODES } from './codes.js'

/**
 * Класс системной ошибки, расширяет стандартный Error
 * @typedef {import('./system-error.js').SystemError} SystemError
 */

/**
 * Определение ошибки
 * @typedef {object} ErrorDefinition
 * @property {string} code - Код ошибки (например, 'SYS_VALIDATION_FAILED').
 * @property {string} message - Шаблон сообщения с плейсхолдерами {key}.
 * @property {string} [subsystem] - Имя подсистемы-источника ошибки.
 * @property {boolean} [recoverable=true] - Можно ли программно восстановиться после этой ошибки.
 * @property {string[]} [contextKeys=[]] - Массив имен ключей, которые должны присутствовать в `context`.
 * @property {string} [docs] - URL или путь к документации по этой ошибке.
 */

/**
 * Зависимости модуля (Только для тестирования DI)
 * @typedef {object} ErrorsDependencies
 * @property {typeof SystemError} SystemError - Класс SystemError.
 * @property {object} ERROR_CODES - Объект с кодами ошибок.
 */
export const dependencies = {
  SystemError,
  ERROR_CODES
}

/**
 * Устанавливает зависимости модуля (Только для тестирования DI)
 * @param {Partial<ErrorsDependencies>} newDependencies - Новые зависимости
 */
export function setDependencies (newDependencies) {
  Object.assign(dependencies, newDependencies)
}

/**
 * Форматирует сообщение об ошибке с подстановкой контекста
 *
 * Основная ответственность:
 * - Подстановка значений из контекста в шаблон
 * - Обработка отсутствующих значений (null, undefined)
 * - Корректная обработка некорректного шаблона
 * Детерминированность: Да.
 *
 * @param {string} template - Шаблон сообщения с {placeholders}
 * @param {Object} [context={}] - Значения для подстановки
 * @returns {string} Отформатированное сообщение. Пустая строка, если template не является строкой.
 */
export function formatMessage (template, context = {}) {
  // Проверяем, что template является строкой
  if (typeof template !== 'string') {
    return ''
  }
  // Используем ?.toString() для безопасного преобразования,
  // возвращаем исходный match ({key}), если значение null или undefined.
  return template.replace(/{(\w+)}/g, (match, key) => {
    const value = context?.[key]
    // Если значение существует и не null/undefined, преобразуем в строку, иначе оставляем плейсхолдер
    return value !== undefined && value !== null ? value.toString() : match
  })
}

/**
 * Проверяет валидность определения ошибки
 *
 * Основная ответственность:
 * - Проверка, является ли definition подходящим объектом.
 * - Проверка наличия и корректности обязательных полей (code, message).
 * - Валидация формата code.
 * - Сбор списка проблем.
 * Детерминированность: Да.
 *
 * @param {any} definition - Проверяемое определение. Ожидается объект.
 * @returns {string[]} Список найденных проблем. Пустой массив, если проблем нет.
 */
export function validateDefinition (definition) {
  const problems = []

  // ИСПРАВЛЕНО: Проверяем, что definition это не-null, не-массив объект
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    problems.push('Definition is missing or invalid.')
    return problems // Дальнейшая проверка бессмысленна для не-объектов
  }

  // Проверка code
  if (typeof definition.code !== 'string' || !definition.code) {
    problems.push('Missing or invalid error code (must be a non-empty string).')
  } else if (!/^[A-Z][A-Z0-9_]*$/.test(definition.code)) {
    // Код должен начинаться с большой буквы и содержать только большие буквы, цифры и _
    problems.push('Invalid error code format (must be UPPER_SNAKE_CASE, starting with a letter).')
  }

  // Проверка message
  if (typeof definition.message !== 'string' || !definition.message) {
    problems.push('Missing or invalid error message (must be a non-empty string).')
  }

  // Можно добавить другие проверки по необходимости (subsystem, recoverable и т.д.)

  return problems
}

/**
 * Создает системную ошибку.
 * Является основной фабрикой для создания экземпляров SystemError.
 * Обрабатывает некорректные входные данные, валидирует определение и контекст (в строгом режиме).
 * Формирует сообщение на основе шаблона и контекста.
 * При внутренних ошибках создания возвращает ошибку SYS_UNEXPECTED.
 * Детерминированность: Нет (зависит от NODE_ENV и может выбросить ошибку).
 *
 * @param {ErrorDefinition} errorDefinition - Определение ошибки из ERROR_CODES.
 * @param {object} [context=null] - Контекст ошибки для подстановки в сообщение и сохранения.
 * @param {Error} [originalError=null] - Исходная ошибка для построения цепочки.
 * @param {object} [options={}] - Опции создания ошибки.
 * @param {boolean} [options.strict] - Строгий режим валидации (по умолчанию зависит от NODE_ENV).
 * @returns {SystemError} Экземпляр системной ошибки.
 */
export function createError (errorDefinition, context = null, originalError = null, options = {}) {
  // Получаем зависимости (SystemError и ERROR_CODES) из локального DI
  const { SystemError: CurrentSystemError, ERROR_CODES: CurrentErrorCodes } = dependencies

  // Определяем режим валидации: строгий по умолчанию, если не production
  const strict = options.strict ?? process.env.NODE_ENV !== 'production'

  // 1. Валидация определения ошибки (только в строгом режиме)
  //    Проверяем само определение перед передачей в конструктор
  if (strict) {
    const definitionProblems = validateDefinition(errorDefinition)
    if (definitionProblems.length > 0) {
      // Если определение некорректно, создаем ошибку валидации
      const validationContext = {
        reason: 'Invalid error definition provided to createError',
        problems: definitionProblems,
        problemsText: definitionProblems.join('; '),
        invalidDefinition: errorDefinition // Добавляем само некорректное определение
      }
      // Используем SystemError из DI для создания ошибки валидации
      return new CurrentSystemError(
        CurrentErrorCodes.SYS.VALIDATION_FAILED,
        validationContext,
        originalError instanceof Error ? originalError : null // Сохраняем только реальные ошибки
        // Не передаем options, чтобы избежать рекурсии валидации
      )
    }
  }

  // 2. Попытка создания целевой ошибки с помощью конструктора SystemError
  try {
    // Создаем экземпляр SystemError с переданными параметрами
    return new CurrentSystemError(
      errorDefinition, // Определение целевой ошибки
      context,
      originalError,
      // Передаем опции (включая strict) в конструктор,
      // чтобы он мог выполнить свои проверки (например, contextKeys)
      { strict }
    )
  } catch (creationError) {
    // 3. Обработка ошибок, возникших ВНУТРИ конструктора SystemError
    //    (например, при валидации contextKeys в строгом режиме или при невалидном definition в non-strict)
    const unexpectedErrorContext = {
      reason: creationError.message || 'Failed to create SystemError instance',
      failedDefinition: errorDefinition,
      failedContext: context
    }
    // Логируем эту ситуацию как критическую (можно добавить реальный логгер при необходимости)
    console.error('[SYS_ERRORS FATAL]: Failed to create SystemError instance. Returning SYS_UNEXPECTED.', {
      creationError, // Оригинальная ошибка конструктора
      context: unexpectedErrorContext
    })

    // Возвращаем ошибку SYS_UNEXPECTED, используя SystemError из DI.
    return new CurrentSystemError(
      CurrentErrorCodes.SYS.UNEXPECTED,
      unexpectedErrorContext,
      creationError // Ошибка конструктора становится original для SYS_UNEXPECTED
      // Не передаем options во избежание рекурсии
    )
  }
}

/**
 * Описание уровня в цепочке ошибок для функции checkErrorChain
 * @typedef {object} ErrorChainLevel
 * @property {string} code - Ожидаемый код ошибки на данном уровне.
 * @property {string} [type] - Ожидаемый тип/класс ошибки (например, 'SystemError', 'TypeError').
 * @property {string|string[]} [message] - Ожидаемый фрагмент(ы) сообщения для поиска (регистронезависимо).
 */

/**
 * Проверяет, соответствует ли цепочка ошибок ожидаемой структуре.
 * Используется преимущественно в тестах для валидации корректности обработки ошибок.
 * Сравнивает код, тип (опционально) и сообщение (опционально) для каждого уровня цепочки.
 * Детерминированность: Да.
 *
 * @param {Error|SystemError|null} error - Проверяемая ошибка (начало цепочки).
 * @param {ErrorChainLevel[]} expectedChain - Массив объектов, описывающих ожидаемые уровни цепочки.
 * @returns {boolean} `true` если цепочка соответствует ожиданиям.
 * @throws {Error} Если цепочка не соответствует ожиданиям (сообщение содержит детали несоответствия).
 */
export function checkErrorChain (error, expectedChain) {
  let currentError = error
  let levelIndex = 0

  if (!Array.isArray(expectedChain)) {
    throw new Error('checkErrorChain failed: expectedChain must be an array.')
  }

  while (levelIndex < expectedChain.length) {
    const expectedLevel = expectedChain[levelIndex]
    const errorPrefix = `Error chain mismatch at level ${levelIndex}`

    // Проверяем, есть ли еще ошибки в цепочке
    if (!currentError) {
      throw new Error(`Error chain validation failed: Expected ${expectedChain.length} levels, but error chain ended at level ${levelIndex}.`)
    }

    // Проверяем, является ли текущий элемент ошибкой
    if (!(currentError instanceof Error)) {
      throw new Error(`${errorPrefix}: Expected an Error object, but got ${typeof currentError}. Value: ${currentError}`)
    }

    // 1. Проверка кода ошибки
    if (expectedLevel.code) {
      if (typeof currentError.code !== 'string') {
        throw new Error(`${errorPrefix}: Expected code '${expectedLevel.code}', but error has no 'code' property or it's not a string. Error: ${currentError?.constructor?.name}`)
      }
      if (currentError.code !== expectedLevel.code) {
        throw new Error(`${errorPrefix}: Expected code '${expectedLevel.code}', got '${currentError.code}'. Message: "${currentError.message}"`)
      }
    }

    // 2. Проверка типа ошибки (если указан)
    if (expectedLevel.type) {
      const actualType = currentError.constructor.name
      if (actualType !== expectedLevel.type) {
        throw new Error(`${errorPrefix}: Expected type '${expectedLevel.type}', got '${actualType}'. Message: "${currentError.message}"`)
      }
    }

    // 3. Проверка содержания сообщения (если указано)
    if (expectedLevel.message) {
      if (typeof currentError.message !== 'string') {
        throw new Error(`${errorPrefix}: Error message is not a string or missing. Error: ${currentError?.constructor?.name}`)
      }
      const currentMessageLower = currentError.message.toLowerCase()
      const expectedMessages = Array.isArray(expectedLevel.message) ? expectedLevel.message : [expectedLevel.message]

      for (const expectedMsg of expectedMessages) {
        if (typeof expectedMsg !== 'string') {
          // Убедимся, что ожидаемое сообщение - строка
          throw new Error(`${errorPrefix}: Invalid expected message fragment (must be string or array of strings). Got type: ${typeof expectedMsg}`)
        }
        if (!currentMessageLower.includes(expectedMsg.toLowerCase())) {
          throw new Error(`${errorPrefix}: Message does not contain expected text '${expectedMsg}'. Full message: "${currentError.message}"`)
        }
      }
    }

    // Переход к следующему уровню
    currentError = currentError.original
    levelIndex++
  }

  // Проверка, что в ошибке не осталось необработанных уровней (опционально)
  if (currentError) {
    throw new Error(`Error chain validation failed: Error chain has more levels than expected (${expectedChain.length}). Next level error: ${currentError?.constructor?.name} [${currentError?.code}] "${currentError?.message}"`);
  }

  return true // Цепочка соответствует
}

// Реэкспорт базовых сущностей для удобства импорта
export { SystemError } from './system-error.js'
export { ERROR_CODES } from './codes.js'
