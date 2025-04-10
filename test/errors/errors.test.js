/**
 * @file test/errors/errors.test.js
 * @description Юнит-тесты для основного API подсистемы ошибок.
 * @version 0.1.8
 * @tested-file src/errors/errors.js
 * @tested-file-version 0.1.7
 * @test-doc docs/tests/TESTS_SYS_ERRORS, v0.2.1.md
 */

import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest'
import { createLogger } from '@fab33/sys-logger'

import {
  formatMessage,
  validateDefinition,
  createError,
  checkErrorChain,
  SystemError, // Импортируем реальный SystemError
  ERROR_CODES, // Импортируем реальные ERROR_CODES
  dependencies, // Импортируем DI объект
  setDependencies // Импортируем функцию установки DI
} from '../../src/errors/errors.js'

// Логгер для тестов
const logger = createLogger('test:errors')

// Сохраняем оригинальные зависимости
const originalDeps = { ...dependencies }
let originalNodeEnv

describe('(SYS_ERRORS) Подсистема работы с ошибками', () => {
  describe('(errors.js) Основной API подсистемы обработки ошибок', () => {
    beforeEach(() => {
      logger.trace('Инициализация тестов errors.js')
      // Восстанавливаем реальные зависимости перед каждым тестом
      setDependencies(originalDeps)
      // Сохраняем и устанавливаем NODE_ENV для тестов по умолчанию (strict)
      originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      // Восстанавливаем NODE_ENV
      process.env.NODE_ENV = originalNodeEnv
    })

    // --- formatMessage() ---
    describe('formatMessage()', () => {
      test('должен корректно подставлять значения из контекста', () => {
        logger.trace('Тест formatMessage: подстановка значений')
        const template = 'Error: {code} occurred in {module} on line {line}.'
        const context = { code: 'E101', module: 'parser', line: 42 }
        const result = formatMessage(template, context)
        logger.debug({ template, context, result }, 'Результат форматирования')
        expect(result).toBe('Error: E101 occurred in parser on line 42.')
      })

      test('должен оставлять плейсхолдеры, если значения в контексте нет', () => {
        logger.trace('Тест formatMessage: отсутствующие значения')
        const template = 'User: {userId}, Action: {action}'
        const context = { userId: 123 } // action отсутствует
        const result = formatMessage(template, context)
        logger.debug({ template, context, result }, 'Результат форматирования')
        expect(result).toBe('User: 123, Action: {action}')
      })

      test('должен корректно обрабатывать null и undefined в контексте', () => {
        logger.trace('Тест formatMessage: null/undefined значения')
        const template = 'Values: null={valNull}, undef={valUndef}'
        const context = { valNull: null, valUndef: undefined }
        const result = formatMessage(template, context)
        logger.debug({ template, context, result }, 'Результат форматирования')
        // Плейсхолдеры остаются, так как значения null/undefined
        expect(result).toBe('Values: null={valNull}, undef={valUndef}')
      })

      test('должен возвращать пустую строку при некорректном шаблоне', () => {
        logger.trace('Тест formatMessage: некорректный шаблон')
        // ИСПРАВЛЕНО: Проверяем null и другие типы
        expect(formatMessage(null)).toBe('')
        expect(formatMessage(undefined)).toBe('')
        expect(formatMessage(123)).toBe('')
        expect(formatMessage({})).toBe('')
      })

      test('должен обрабатывать пустой шаблон или контекст', () => {
        logger.trace('Тест formatMessage: пустые входные данные')
        expect(formatMessage('')).toBe('')
        expect(formatMessage('Template', {})).toBe('Template')
        expect(formatMessage('Template', null)).toBe('Template')
      })
    })

    // --- validateDefinition() ---
    describe('validateDefinition()', () => {
      test('должен возвращать пустой массив для корректного определения', () => {
        logger.trace('Тест validateDefinition: валидное определение')
        const definition = { code: 'VALID_CODE', message: 'Valid message' }
        const problems = validateDefinition(definition)
        logger.debug({ definition, problems }, 'Результат валидации')
        expect(problems).toEqual([])
      })

      test('должен найти отсутствующие обязательные поля для пустого объекта', () => {
        logger.trace('Тест validateDefinition: отсутствующие поля ({})')
        const definition = {}
        const problems = validateDefinition(definition)
        logger.debug({ definition, problems }, 'Результат валидации')
        // Ожидаем точные сообщения об отсутствующих полях
        expect(problems).toContain('Missing or invalid error code (must be a non-empty string).')
        expect(problems).toContain('Missing or invalid error message (must be a non-empty string).')
        expect(problems).toHaveLength(2)
      })

      test('должен проверить неверный формат кода ошибки', () => {
        logger.trace('Тест validateDefinition: неверный формат кода')
        const definition = { code: 'invalid-code', message: 'Test Message' }
        const problems = validateDefinition(definition)
        logger.debug({ definition, problems }, 'Результат валидации')
        // Ожидаем точное сообщение об ошибке формата
        expect(problems).toContain('Invalid error code format (must be UPPER_SNAKE_CASE, starting with a letter).')
      })

      test('должен возвращать "Definition is missing or invalid." для null и undefined', () => {
        logger.trace('Тест validateDefinition: null/undefined')
        const cases = [null, undefined]
        cases.forEach(input => {
          const problems = validateDefinition(input)
          logger.debug({ input, problems }, 'Результат валидации для null/undefined')
          // Ожидаем специфичное сообщение для этих случаев
          expect(problems).toEqual(['Definition is missing or invalid.'])
        })
      })

      test('должен возвращать "Definition is missing or invalid." для других невалидных типов', () => {
        logger.trace('Тест validateDefinition: другие невалидные типы')
        const cases = [123, 'string', true, []]
        cases.forEach(input => {
          const problems = validateDefinition(input)
          logger.debug({ input, problems }, `Результат валидации для ${typeof input}`)
          // Ожидаем то же сообщение, что и для null/undefined
          expect(problems).toEqual(['Definition is missing or invalid.'])
        })
      })
    })

    // --- createError() ---
    describe('createError()', () => {
      const validDefinition = ERROR_CODES.SYS.NOT_IMPLEMENTED
      const context = { feature: 'Test Feature' }
      const originalError = new Error('Original Cause')

      test('должен успешно создать SystemError с полными данными', () => {
        logger.trace('Тест createError: успешное создание')
        const error = createError(validDefinition, context, originalError)
        logger.debug({ error: error.toJSON() }, 'Созданная ошибка')
        expect(error).toBeInstanceOf(SystemError)
        expect(error.code).toBe(validDefinition.code)
        expect(error.message).toBe(formatMessage(validDefinition.message, context))
        expect(error.context).toEqual(context)
        expect(error.original).toBe(originalError)
      })

      test('должен вернуть SYS_VALIDATION_FAILED при невалидном definition в strict режиме', () => {
        logger.trace('Тест createError: невалидное definition (strict)')
        process.env.NODE_ENV = 'development'
        const invalidDefinition = { message: 'Only message' }
        const error = createError(invalidDefinition, {}, originalError)
        logger.debug({ error: error.toJSON() }, 'Созданная ошибка валидации')
        expect(error.code).toBe(ERROR_CODES.SYS.VALIDATION_FAILED.code)
        expect(error.context.reason).toBe('Invalid error definition provided to createError')
        expect(error.context.problems).toEqual(['Missing or invalid error code (must be a non-empty string).'])
        expect(error.original).toBe(originalError)
      })

      test('должен вернуть SYS_UNEXPECTED при ошибке внутри конструктора SystemError (из-за contextKeys)', () => {
        logger.trace('Тест createError: ошибка конструктора SystemError (contextKeys)')
        process.env.NODE_ENV = 'development' // strict режим
        // Используем реальное определение, требующее contextKeys
        const defRequiresContext = ERROR_CODES.SYS.VALIDATION_FAILED
        // Передаем контекст без обязательного ключа 'problems'
        const invalidContext = { reason: 'Missing problems key', problemsText: 'problems missing' }

        // Не мокаем конструктор, а провоцируем реальную ошибку
        const error = createError(defRequiresContext, invalidContext, originalError)
        logger.debug({ error: error.toJSON() }, 'Созданная ошибка SYS_UNEXPECTED')

        // Проверяем, что createError вернул SYS_UNEXPECTED
        expect(error.code).toBe(ERROR_CODES.SYS.UNEXPECTED.code)
        expect(error.context.reason).toMatch(/Missing required context keys: problems/) // Проверяем причину
        expect(error.context.failedDefinition).toBe(defRequiresContext)
        expect(error.context.failedContext).toBe(invalidContext)
        // Проверяем, что original содержит ошибку, выброшенную конструктором SystemError
        expect(error.original).toBeInstanceOf(Error)
        expect(error.original.message).toMatch(/Missing required context keys: problems/)
      })

      test('должен вернуть SYS_UNEXPECTED в non-strict режиме, если конструктор упадет', () => {
        logger.trace('Тест createError: non-strict режим, падение конструктора')
        process.env.NODE_ENV = 'production' // non-strict
        const invalidDefinition = { message: 'Only message' } // Нет code

        const error = createError(invalidDefinition)
        logger.debug({ error: error.toJSON() }, 'Созданная ошибка (non-strict)')

        // Конструктор SystemError упадет из-за отсутствия code, createError вернет SYS_UNEXPECTED
        expect(error.code).toBe(ERROR_CODES.SYS.UNEXPECTED.code)
        expect(error.original).toBeInstanceOf(Error)
        expect(error.original.message).toContain('SystemError constructor: Invalid or incomplete error definition passed.')
        expect(error.context.reason).toBe(error.original.message) // Причина берется из ошибки конструктора
      })
    })

    // --- checkErrorChain() ---
    describe('checkErrorChain()', () => {
      // Создаем тестовые ошибки
      const errLvl2 = new SystemError(ERROR_CODES.SYS.INVALID_ARGUMENT, { name: 'arg1', reason: 'is null' })
      const errLvl1 = new SystemError(
        ERROR_CODES.SYS.VALIDATION_FAILED,
        { reason: 'Outer fail', problems: ['p1'], problemsText: 'Problem 1' }, // Добавлен problems
        errLvl2
      )

      test('должен вернуть true для соответствующей цепочки', () => {
        logger.trace('Тест checkErrorChain: успешная проверка')
        const expectedChain = [
          { code: 'SYS_VALIDATION_FAILED', type: 'SystemError', message: 'Outer fail' },
          { code: 'SYS_INVALID_ARGUMENT', message: ['argument', 'null'] }
        ]
        expect(() => checkErrorChain(errLvl1, expectedChain)).not.toThrow()
        expect(checkErrorChain(errLvl1, expectedChain)).toBe(true)
      })

      test('должен выбросить ошибку при неверном коде', () => {
        logger.trace('Тест checkErrorChain: неверный код')
        const expectedChain = [
          { code: 'SYS_UNEXPECTED' },
          { code: 'SYS_INVALID_ARGUMENT' }
        ]
        expect(() => checkErrorChain(errLvl1, expectedChain)).toThrow(/Expected code 'SYS_UNEXPECTED', got 'SYS_VALIDATION_FAILED'/)
      })

      test('должен выбросить ошибку при неверном типе', () => {
        logger.trace('Тест checkErrorChain: неверный тип')
        const errLvl2TypeError = new TypeError('Original type error')
        const errLvl1WithTypeError = new SystemError(
          ERROR_CODES.SYS.UNEXPECTED,
          { reason: 'Wrapping TypeError' },
          errLvl2TypeError
        )
        const expectedChain = [
          { code: 'SYS_UNEXPECTED' },
          { type: 'SystemError' } // Ожидаем SystemError, а там TypeError
        ]
        expect(() => checkErrorChain(errLvl1WithTypeError, expectedChain)).toThrow(/Expected type 'SystemError', got 'TypeError'/)
      })

      test('должен выбросить ошибку, если сообщение не содержит фрагмент', () => {
        logger.trace('Тест checkErrorChain: неверное сообщение (строка)')
        const expectedChain = [
          { code: 'SYS_VALIDATION_FAILED', message: 'NonExistentWord' }
        ]
        expect(() => checkErrorChain(errLvl1, expectedChain)).toThrow(/Message does not contain expected text 'NonExistentWord'/)
      })

      test('должен выбросить ошибку, если сообщение не содержит один из фрагментов массива', () => {
        logger.trace('Тест checkErrorChain: неверное сообщение (массив)')
        const expectedChain = [
          { code: 'SYS_VALIDATION_FAILED' },
          { code: 'SYS_INVALID_ARGUMENT', message: ['argument', 'NonExistentWord'] }
        ]
        expect(() => checkErrorChain(errLvl1, expectedChain)).toThrow(/Message does not contain expected text 'NonExistentWord'/)
      })

      test('должен выбросить ошибку, если ожидаемая цепочка длиннее фактической', () => {
        logger.trace('Тест checkErrorChain: ожидаемая цепочка длиннее')
        const expectedChain = [
          { code: 'SYS_VALIDATION_FAILED' },
          { code: 'SYS_INVALID_ARGUMENT' },
          { code: 'SOME_THIRD_LEVEL_ERROR' }
        ]
        expect(() => checkErrorChain(errLvl1, expectedChain)).toThrow(/Expected 3 levels, but error chain ended at level 2/)
      })

      test('должен выбросить ошибку, если фактическая цепочка длиннее ожидаемой', () => {
        logger.trace('Тест checkErrorChain: фактическая цепочка длиннее')
        const expectedChain = [
          { code: 'SYS_VALIDATION_FAILED' } // Ожидаем только 1 уровень
        ]
        expect(() => checkErrorChain(errLvl1, expectedChain)).toThrow(/Error chain has more levels than expected \(1\)/)
      })

      test('должен выбросить ошибку при некорректном expectedChain', () => {
        logger.trace('Тест checkErrorChain: некорректный expectedChain')
        expect(() => checkErrorChain(errLvl1, null)).toThrow(/expectedChain must be an array/)
        expect(() => checkErrorChain(errLvl1, {})).toThrow(/expectedChain must be an array/)
      })
    })
  })
})
