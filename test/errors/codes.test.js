/**
 * @file test/errors/codes.test.js
 * @version 0.1.5
 * @tested-file src/errors/codes.js
 * @tested-file-version 0.1.3
 * @test-doc docs/tests/TESTS_SYS_ERRORS, v0.2.1.md
 */

import { describe, expect, test, beforeEach } from 'vitest'
import { createLogger } from '@fab33/sys-logger'

import { ERROR_CODES } from '../../src/errors/codes.js'

// Используем реальный логгер для отладки тестов
const logger = createLogger('test:errors:codes')

describe('(SYS_ERRORS) Подсистема работы с ошибками', () => {
  describe('(codes.js) Агрегация кодов ошибок', () => {
    beforeEach(() => {
      logger.trace('Инициализация тестов codes.js')
    })

    describe('ERROR_CODES - структура и содержание', () => {
      test('должен иметь корректную структуру системных ошибок', () => {
        logger.trace('Тест: структура системных ошибок')
        logger.debug('ERROR_CODES:', ERROR_CODES)

        expect(ERROR_CODES).toBeDefined()
        expect(ERROR_CODES.SYS).toBeDefined()

        // Проверяем наличие основных системных ошибок
        const requiredErrors = [
          'INITIALIZATION_FAILED',
          'UNEXPECTED',
          'VALIDATION_FAILED',
          'NOT_IMPLEMENTED',
          'INVALID_ARGUMENT'
        ]

        requiredErrors.forEach(errorName => {
          logger.debug(`Проверка наличия ${errorName} в ERROR_CODES.SYS`)
          expect(ERROR_CODES.SYS[errorName]).toBeDefined()
        })

        // Проверяем структуру определения на примере INITIALIZATION_FAILED
        const initError = ERROR_CODES.SYS.INITIALIZATION_FAILED
        logger.debug('Структура INITIALIZATION_FAILED:', initError)

        expect(initError).toMatchObject({
          code: 'SYS_INIT_FAILED',
          message: expect.any(String),
          subsystem: 'system',
          recoverable: false
        })
      })

      test('должен иметь корректный формат кодов ошибок', () => {
        logger.trace('Тест: формат кодов ошибок')

        /**
         * Рекурсивно проверяет корректность форматов кодов ошибок
         *
         * @param {Object} codes - Объект с кодами ошибок для проверки
         * @param {string[]} path - Текущий путь в иерархии кодов
         */
        function validateErrorCodes (codes, path = []) {
          Object.entries(codes).forEach(([key, definition]) => {
            const currentPath = [...path, key]
            logger.trace(`Проверка пути ${currentPath.join('.')}`)

            if (definition && typeof definition === 'object') {
              if (definition.code) {
                logger.debug(`Проверка формата кода ${definition.code}`)

                // Код должен быть в верхнем регистре
                expect(definition.code).toBe(definition.code.toUpperCase())

                // Проверяем формат кода
                expect(definition.code).toMatch(/^[A-Z][A-Z0-9_]*$/)

                // Должно быть сообщение
                expect(definition.message).toBeDefined()
                expect(typeof definition.message).toBe('string')

                // Если есть subsystem, должна быть строкой
                if ('subsystem' in definition) {
                  expect(typeof definition.subsystem).toBe('string')
                }

                // Если есть recoverable, должен быть boolean
                if ('recoverable' in definition) {
                  expect(typeof definition.recoverable).toBe('boolean')
                }

                // Если есть contextKeys, должен быть массивом строк
                if ('contextKeys' in definition) {
                  expect(Array.isArray(definition.contextKeys)).toBe(true)
                  definition.contextKeys.forEach(key => {
                    expect(typeof key).toBe('string')
                  })
                }
              } else {
                // Рекурсивно проверяем вложенные определения
                validateErrorCodes(definition, currentPath)
              }
            }
          })
        }

        validateErrorCodes(ERROR_CODES)
      })

      test('должен иметь корректные сообщения с плейсхолдерами', () => {
        logger.trace('Тест: проверка сообщений и плейсхолдеров')

        /**
         * Рекурсивно проверяет соответствие плейсхолдеров и contextKeys в сообщениях
         *
         * @param {Object} codes - Коды ошибок для проверки
         * @param {string[]} path - Текущий путь в иерархии
         */
        function validateMessages (codes, path = []) {
          Object.entries(codes).forEach(([key, definition]) => {
            const currentPath = [...path, key]
            logger.trace(`Проверка пути ${currentPath.join('.')}`)

            if (definition && typeof definition === 'object') {
              if (definition.code) {
                logger.debug(`Проверка сообщения для кода ${definition.code}:`, definition.message)

                // Получаем плейсхолдеры из сообщения
                const placeholders = (definition.message.match(/{(\w+)}/g) || [])
                  .map(p => p.slice(1, -1))

                // Если указаны contextKeys, проверяем что все плейсхолдеры в них есть
                if (definition.contextKeys) {
                  placeholders.forEach(placeholder => {
                    logger.debug(`Проверка плейсхолдера ${placeholder} для ${definition.code}`)
                    const isRequired = definition.contextKeys.includes(placeholder)
                    expect(isRequired).toBe(true,
                      `Плейсхолдер {${placeholder}} не указан в contextKeys для ${currentPath.join('.')}`)
                  })
                }
              } else {
                // Рекурсивно проверяем вложенные определения
                validateMessages(definition, currentPath)
              }
            }
          })
        }

        validateMessages(ERROR_CODES)
      })

      test('должен иметь уникальные коды ошибок', () => {
        logger.trace('Тест: уникальность кодов ошибок')

        const codes = new Set()

        /**
         * Рекурсивно собирает и проверяет уникальность кодов ошибок
         *
         * @param {Object} definitions - Определения ошибок
         * @param {string[]} path - Текущий путь в иерархии
         */
        function collectErrorCodes (definitions, path = []) {
          Object.entries(definitions).forEach(([key, definition]) => {
            const currentPath = [...path, key]
            logger.trace(`Проверка пути ${currentPath.join('.')}`)

            if (definition && typeof definition === 'object') {
              if (definition.code) {
                logger.debug(`Проверка уникальности кода ${definition.code}`)
                expect(codes.has(definition.code)).toBe(false,
                  `Дублирующийся код ${definition.code} найден по пути ${currentPath.join('.')}`)
                codes.add(definition.code)
              } else {
                // Рекурсивно собираем коды из вложенных определений
                collectErrorCodes(definition, currentPath)
              }
            }
          })
        }

        collectErrorCodes(ERROR_CODES)
        logger.info(`Всего уникальных кодов: ${codes.size}`)
      })
    })
  })
})
