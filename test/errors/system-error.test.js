/**
 * @file test/errors/system-error.test.js
 * @description Юнит-тесты для класса SystemError.
 * @version 0.1.5
 * @tested-file src/errors/system-error.js
 * @tested-file-version 0.2.0
 * @test-doc docs/tests/TESTS_SYS_ERRORS, v0.1.0.md
 */

import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { createLogger } from '@fab33/sys-logger' // Используем для логгера самого теста
import { SystemError } from '../../src/errors/system-error.js' // Импортируем реальный класс

// Логгер для тестов
const logger = createLogger('test:errors:system-error')

describe('(SYS_ERRORS) Подсистема работы с ошибками', () => {
  describe('(system-error.js) Базовый класс системных ошибок', () => {
    // Переменные окружения можно устанавливать здесь, если нужно менять между тестами
    let originalNodeEnv

    beforeEach(() => {
      logger.trace('Инициализация тестов system-error.js')
      // Сохраняем и устанавливаем NODE_ENV для тестов, требующих strict=true
      originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      logger.trace('Завершение тестов system-error.js')
      // Восстанавливаем NODE_ENV
      process.env.NODE_ENV = originalNodeEnv
    })

    describe('class SystemError', () => {
      // --- Тесты конструктора ---
      test('должен создать экземпляр с полными данными', () => {
        logger.trace('Тест конструктора: создание с полными данными')

        const definition = {
          code: 'TEST_ERROR',
          message: 'Error: {value}',
          subsystem: 'test',
          recoverable: false,
          contextKeys: ['value'],
          docs: 'docs/test.md'
        }
        const context = { value: 'test_data' }
        const original = new Error('Original Error Message')

        const error = new SystemError(definition, context, original)
        logger.debug({ errorInstance: error }, 'Созданная ошибка')

        // Проверяем основные свойства
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(SystemError)
        expect(error.name).toBe('SystemError')
        expect(error.code).toBe(definition.code)
        expect(error.message).toBe('Error: test_data') // Проверяем форматирование
        expect(error.msg).toBe(definition.message) // Проверяем сохранение шаблона
        expect(error.subsystem).toBe(definition.subsystem)
        expect(error.recoverable).toBe(definition.recoverable)
        expect(error.context).toEqual(context)
        expect(error.docs).toBe(definition.docs)
        expect(error.original).toBe(original)
        expect(error.stack).toBeDefined()
        expect(error.stack).toContain('system-error.test.js') // Проверяем, что стек не обрезан
      })

      test('должен выбрасывать ошибку при невалидном definition', () => {
        logger.trace('Тест конструктора: невалидное definition')
        const invalidDefinition = { message: 'Only message' } // Нет code
        expect(() => new SystemError(invalidDefinition)).toThrow('SystemError constructor: Invalid or incomplete error definition passed.')
      })

      test('должен выбрасывать ошибку при отсутствии ключей контекста в strict режиме', () => {
        logger.trace('Тест конструктора: отсутствует ключ контекста (strict)')
        const definition = {
          code: 'CTX_REQUIRED',
          message: 'Value: {value}',
          subsystem: 'test',
          contextKeys: ['value', 'another'] // Требуем 'another'
        }
        const context = { value: 'present' } // 'another' отсутствует
        // process.env.NODE_ENV уже 'development' (strict=true)
        expect(() => new SystemError(definition, context)).toThrow('SystemError [CTX_REQUIRED]: Missing required context keys: another.')
      })

      test('НЕ должен выбрасывать ошибку при отсутствии ключей контекста в non-strict режиме', () => {
        logger.trace('Тест конструктора: отсутствует ключ контекста (non-strict)')
        process.env.NODE_ENV = 'production' // Устанавливаем non-strict режим
        const definition = {
          code: 'CTX_REQUIRED',
          message: 'Value: {value}',
          subsystem: 'test',
          contextKeys: ['value', 'another']
        }
        const context = { value: 'present' }
        expect(() => new SystemError(definition, context)).not.toThrow()
        // Дополнительно проверим созданную ошибку
        const error = new SystemError(definition, context)
        expect(error.code).toBe('CTX_REQUIRED')
      })

      // --- Тесты метода format() ---
      describe('format()', () => {
        test('должен корректно форматировать сообщение (без original/docs)', () => {
          logger.trace('Тест format(): базовый случай')
          const error = new SystemError({ code: 'SIMPLE', message: 'Simple message', subsystem: 'test' })
          expect(error.format()).toBe('SystemError [SIMPLE]: Simple message')
        })

        test('должен добавлять ссылку на документацию', () => {
          logger.trace('Тест format(): с документацией')
          const error = new SystemError({ code: 'DOCS_ERR', message: 'Error with docs', subsystem: 'test', docs: 'path/to/docs' })
          expect(error.format()).toContain('Docs: path/to/docs')
        })

        test('должен добавлять информацию об оригинальной ошибке', () => {
          logger.trace('Тест format(): с оригинальной ошибкой')
          const original = new TypeError('Original type error')
          const error = new SystemError({ code: 'CHAINED', message: 'Chained error', subsystem: 'test' }, null, original)
          const formatted = error.format()
          expect(formatted).toContain('Caused by: TypeError: Original type error')
        })
      })

      // --- Тесты метода toJSON() ---
      describe('toJSON()', () => {
        test('должен корректно сериализовать ошибку (без original/docs)', () => {
          logger.trace('Тест toJSON(): базовый случай')
          const definition = { code: 'SERIALIZE_BASIC', message: 'Serialize basic', subsystem: 'test' }
          const context = { data: 1 }
          const error = new SystemError(definition, context)
          const json = error.toJSON()
          logger.debug({ json }, 'Сериализованная ошибка (базовая)')

          expect(json).toMatchObject({
            name: 'SystemError',
            code: definition.code,
            message: definition.message,
            msg: definition.message,
            subsystem: definition.subsystem,
            context: context,
            recoverable: true, // default
            docs: undefined,
            stack: expect.any(String),
            original: undefined
          })
        })

        test('должен включать docs и сериализованный original', () => {
          logger.trace('Тест toJSON(): с docs и original')
          const original = new Error('Original error message')
          original.stack = 'original stack trace' // Устанавливаем стек для проверки
          const definition = { code: 'SERIALIZE_FULL', message: 'Serialize full', subsystem: 'test', docs: 'path/to/docs', recoverable: false }
          const context = { id: 'abc' }
          const error = new SystemError(definition, context, original)
          const json = error.toJSON()
          logger.debug({ json }, 'Сериализованная ошибка (полная)')

          expect(json).toMatchObject({
            name: 'SystemError',
            code: definition.code,
            message: definition.message,
            msg: definition.message,
            subsystem: definition.subsystem,
            context: context,
            recoverable: false,
            docs: definition.docs,
            stack: expect.any(String),
            original: { // Ожидаем базовые поля из original
              name: 'Error',
              message: original.message,
              stack: original.stack
            }
          })
        })

        test('должен рекурсивно вызывать toJSON для original, если он SystemError', () => {
          logger.trace('Тест toJSON(): original - тоже SystemError')
          const originalDef = { code: 'ORIGINAL_SYS', message: 'Original system error', subsystem: 'original_sub' }
          const originalError = new SystemError(originalDef, { nested: true })
          const mainDef = { code: 'MAIN_SYS', message: 'Main system error', subsystem: 'main_sub' }
          const error = new SystemError(mainDef, null, originalError)
          const json = error.toJSON()
          logger.debug({ json }, 'Сериализованная ошибка (вложенный SystemError)')

          expect(json.original).toBeDefined()
          expect(json.original.name).toBe('SystemError') // Проверяем, что вызван toJSON оригинала
          expect(json.original.code).toBe(originalDef.code)
          expect(json.original.context).toEqual({ nested: true })
          expect(json.original.original).toBeUndefined() // Вложенность останавливается
        })
      })
    })
  })
})
