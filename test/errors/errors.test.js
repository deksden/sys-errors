/**
 * @file test/errors/errors.test.js
 * @version 0.1.5
 * @tested-file src/errors/errors-nodes.js
 * @tested-file-version 0.1.3
 * @test-doc docs/tests/TESTS_SYS_ERRORS, v0.2.1.md
 */

import { describe, expect, test, beforeEach } from 'vitest'
import { createLogger } from '@fab33/sys-logger'

import {
  formatMessage,
  validateDefinition,
  createError,
  SystemError
} from '../../src/errors/errors.js'

/**
 * ВАЖНОЕ РЕШЕНИЕ ПО ТЕСТИРОВАНИЮ:
 *
 * После анализа подхода с моком SystemError было принято решение
 * отказаться от мока в пользу реального класса SystemError. Причины:
 *
 * 1. Мок создавал сложности:
 *    - Сложная реализация мока
 *    - Хрупкость тестов
 *    - Ошибки в самом моке
 *    - Неполное соответствие реальному поведению
 *
 * 2. Все необходимые проверки можно выполнить с реальным классом:
 *    - Проверка создания с разными параметрами
 *    - Проверка обработки ошибок
 *    - Проверка валидации
 *    - Проверка recoverable флага
 *    - Проверка работы с разными режимами
 *
 * 3. Преимущества использования реального класса:
 *    - Тестируем реальное поведение системы
 *    - Более простые и понятные тесты
 *    - Лучшая устойчивость к рефакторингу
 *    - Тесты ближе к реальному использованию
 *
 * 4. Мокаем только действительно необходимые зависимости:
 *    - Внешние системы
 *    - Базы данных
 *    - Файловую систему
 *    - Сетевые вызовы
 */

// Используем реальный логгер для отладки тестов
const logger = createLogger('test:errors')

describe('(SYS_ERRORS) Подсистема работы с ошибками', () => {
  describe('(errors-nodes.js) Основной API подсистемы обработки ошибок', () => {
    beforeEach(() => {
      logger.trace('Инициализация тестов errors-nodes.js')
      // Устанавливаем окружение
      process.env.NODE_ENV = 'development'
    })

    describe('formatMessage()', () => {
      test('должен подставить значения из контекста', () => {
        logger.trace('Тест: подстановка значений в шаблон')

        const template = 'Error: {code} at {line}'
        const context = { code: 'TEST', line: 42 }

        const result = formatMessage(template, context)
        logger.debug('Отформатированное сообщение:', result)

        expect(result).toBe('Error: TEST at 42')
      })

      test('должен сохранить плейсхолдеры при отсутствии значений', () => {
        logger.trace('Тест: отсутствующие значения')

        const template = 'Missing value: {key}'
        const context = {}

        const result = formatMessage(template, context)
        logger.debug('Отформатированное сообщение:', result)

        expect(result).toBe('Missing value: {key}')
      })

      test('должен корректно обработать null и undefined', () => {
        logger.trace('Тест: null/undefined значения')

        const template = 'Values: {null}, {undefined}'
        const context = { null: null, undefined }

        const result = formatMessage(template, context)
        logger.debug('Отформатированное сообщение:', result)

        expect(result).toBe('Values: {null}, {undefined}')
      })

      test('должен обработать пустые входные данные', () => {
        logger.trace('Тест: пустые входные данные')

        expect(formatMessage()).toBe('')
        expect(formatMessage('')).toBe('')
        expect(formatMessage('', null)).toBe('')
        expect(formatMessage('', undefined)).toBe('')
      })
    })

    describe('validateDefinition()', () => {
      test('должен принять корректное определение', () => {
        logger.trace('Тест: валидное определение')

        const definition = {
          code: 'TEST_ERROR',
          message: 'Test error: {reason}'
        }

        const problems = validateDefinition(definition)
        logger.debug('Найденные проблемы:', problems)

        expect(problems).toHaveLength(0)
      })

      test('должен найти отсутствующие обязательные поля', () => {
        logger.trace('Тест: отсутствующие поля')

        const problems = validateDefinition({})
        logger.debug('Найденные проблемы:', problems)

        expect(problems).toContain('Missing error code')
        expect(problems).toContain('Missing error message')
      })

      test('должен проверить формат кода ошибки', () => {
        logger.trace('Тест: формат кода ошибки')

        const definition = {
          code: 'invalid-code',
          message: 'Test'
        }

        const problems = validateDefinition(definition)
        logger.debug('Найденные проблемы:', problems)

        expect(problems).toContain('Invalid error code format')
      })

      test('должен обработать некорректные входные данные', () => {
        logger.trace('Тест: некорректные входные данные')

        const cases = [undefined, null]
        cases.forEach(input => {
          const problems = validateDefinition(input)
          logger.debug(`Проблемы для ${input}:`, problems)
          expect(problems).toContain('Missing error code')
        })
      })
    })

    describe('createError()', () => {
      const validDefinition = {
        code: 'TEST_ERROR',
        message: 'Test error: {reason}',
        subsystem: 'test',
        recoverable: false
      }

      test('должен создать ошибку с полными данными', () => {
        logger.trace('Тест: создание полной ошибки')

        const context = { reason: 'test failure' }
        const originalError = new Error('Original error')

        const error = createError(validDefinition, context, originalError)
        logger.debug('Созданная ошибка:', error)

        expect(error).toBeInstanceOf(SystemError)
        expect(error.code).toBe('TEST_ERROR')
        expect(error.message).toBe('Test error: test failure')
        expect(error.subsystem).toBe('test')
        expect(error.recoverable).toBe(false)
        expect(error.context).toEqual(context)
        expect(error.original).toBe(originalError)
      })

      test('должен валидировать определение в строгом режиме', () => {
        logger.trace('Тест: строгая валидация')

        const invalidDefinition = {
          message: 'Missing code'
        }

        const error = createError(invalidDefinition)
        logger.debug('Созданная ошибка:', error)

        // Проверяем что создана ошибка валидации
        expect(error).toBeInstanceOf(SystemError)
        expect(error.code).toBe('SYS_VALIDATION_FAILED')
        expect(error.message).toContain('Invalid error definition')
      })

      test('должен пропустить валидацию в production', () => {
        logger.trace('Тест: production режим')

        process.env.NODE_ENV = 'production'

        const invalidDefinition = {
          message: 'Missing code'
        }

        const error = createError(invalidDefinition)
        logger.debug('Созданная ошибка:', error)

        expect(error).toBeInstanceOf(SystemError)
        expect(error.message).toBe('Missing code')
      })
    })
  })
})
