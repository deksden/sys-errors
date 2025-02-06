/**
 * @file test/errors/system-error.test.js
 * @version 0.1.4
 * @tested-file src/errors/system-error.js
 * @tested-file-version 0.1.1
 * @test-doc docs/tests/TESTS_SYS_ERRORS, v0.1.0.md
 */

import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { createLogger } from '@fab33/sys-logger'
import { SystemError, dependencies as sysErrorDeps, setDependencies } from '../../src/errors/system-error.js'

// Используем реальный логгер для отладки тестов
const logger = createLogger('test:errors:system-error')

describe('(SYS_ERRORS) Подсистема работы с ошибками', () => {
  describe('(system-error.js) Базовый класс системных ошибок', () => {
    // Сохраняем оригинальные зависимости
    const origDeps = { ...sysErrorDeps }

    beforeEach(() => {
      logger.trace('Инициализация тестов system-error.js')

      // Устанавливаем зависимости
      setDependencies({
        logger // Используем реальный логгер
      })

      // Устанавливаем окружение
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      logger.trace('Восстановление зависимостей после тестов')
      setDependencies(origDeps)
    })

    describe('class SystemError', () => {
      test('должен создать экземпляр с полными данными', () => {
        logger.trace('Тест: создание с полными данными')

        const definition = {
          code: 'TEST_ERROR',
          message: 'Error: {value}',
          subsystem: 'test',
          recoverable: false,
          contextKeys: ['value'],
          docs: 'docs/test.md'
        }
        const context = { value: 'test' }
        const original = new Error('Original')

        const error = new SystemError(definition, context, original)
        logger.debug('Создана ошибка:', error)

        // Проверяем метаданные
        expect(error).toBeInstanceOf(Error)
        expect(error.name).toBe('SystemError')
        expect(error.code).toBe('TEST_ERROR')
        expect(error.message).toBe('Error: test')
        expect(error.subsystem).toBe('test')
        expect(error.recoverable).toBe(false)
        expect(error.context).toEqual(context)
        expect(error.docs).toBe('docs/test.md')
        expect(error.original).toBe(original)
        expect(error.stack).toBeDefined()
      })

      test('должен валидировать обязательные поля в строгом режиме', () => {
        logger.trace('Тест: валидация обязательных полей')

        const invalidDefinition = {
          message: 'Test error'
        }

        const createInvalidError = () => new SystemError(invalidDefinition)

        expect(createInvalidError).toThrow('Invalid error definition: missing required fields')
      })

      test('должен проверять наличие required контекста', () => {
        logger.trace('Тест: проверка required контекста')

        const definition = {
          code: 'TEST_ERROR',
          message: 'Error: {value}',
          contextKeys: ['value', 'extra']
        }
        const context = { value: 'test' }

        const createErrorWithMissingContext = () => new SystemError(definition, context)

        expect(createErrorWithMissingContext).toThrow('Missing required context keys: extra')
      })

      test('должен пропустить валидацию в production', () => {
        logger.trace('Тест: production режим')

        process.env.NODE_ENV = 'production'

        const invalidDefinition = {
          message: 'Test error'
        }

        const error = new SystemError(invalidDefinition)
        logger.debug('Создана ошибка в production режиме:', error)
        expect(error.message).toBe('Test error')
      })

      describe('format()', () => {
        test('должен форматировать сообщение для вывода', () => {
          logger.trace('Тест: форматирование сообщения')

          const definition = {
            code: 'TEST_ERROR',
            message: 'Test error',
            docs: 'docs/test.md'
          }
          const original = new Error('Original error')

          const error = new SystemError(definition, {}, original)
          const formatted = error.format()
          logger.debug('Отформатированное сообщение:', formatted)

          expect(formatted).toContain('Test error')
          expect(formatted).toContain('docs/test.md')
          expect(formatted).toContain('Original error')
        })
      })

      describe('toJSON()', () => {
        test('должен сериализовать ошибку для логирования', () => {
          logger.trace('Тест: сериализация для логов')

          const definition = {
            code: 'TEST_ERROR',
            message: 'Test error',
            subsystem: 'test',
            docs: 'docs/test.md'
          }
          const context = { value: 'test' }
          const original = new Error('Original error')

          const error = new SystemError(definition, context, original)
          const json = error.toJSON()

          logger.debug('Сериализованная ошибка:', json)

          expect(json).toEqual({
            name: 'SystemError',
            code: 'TEST_ERROR',
            message: 'Test error',
            msg: 'Test error',
            subsystem: 'test',
            context: { value: 'test' },
            recoverable: true,
            docs: 'docs/test.md',
            stack: error.stack,
            original: {
              message: 'Original error',
              stack: original.stack
            }
          })
        })
      })
    })
  })
})
