# Подсистема обработки ошибок (docs/errors/SYS_ERRORS.md, v0.3.0)

Подсистема: SYS_ERRORS: "errors" система обработки ошибок

## Описание

Подсистема предоставляет единый механизм для создания, обработки и форматирования ошибок в системе. Основные возможности:
- Централизованное определение ошибок подсистем через ERROR_CODES
- Создание ошибок с контекстом и метаданными через SystemError
- Форматирование сообщений с поддержкой шаблонов
- Валидация ошибок с гибкими настройками
- Сериализация для логирования
- Поддержка цепочки ошибок (error chaining)

Роль в системе:
- Является центральной точкой для обработки ошибок всех подсистем
- Предоставляет базовый класс SystemError для всех ошибок
- Обеспечивает единообразие в создании и обработке ошибок
- Интегрируется с SYS_LOGGER для логирования ошибок

## Концептуальная модель

1. Абстракции
   
   - SystemError - базовый класс ошибок
     - Наследуется от стандартного Error
     - Добавляет метаданные (код, подсистема, контекст)
     - Поддерживает цепочку ошибок через originalError
     - Имеет методы форматирования и сериализации

   - ErrorDefinition - описание типа ошибки
     - Код ошибки и шаблон сообщения
     - Принадлежность к подсистеме
     - Возможность восстановления
     - Обязательные поля контекста
     - Ссылка на документацию

   - ErrorContext - контекст возникновения ошибки
     - Динамические данные для сообщения
     - Техническая информация
     - Состояние системы
     - Параметры операции

2. Принципы работы
   
   - Централизация определений
     - Все коды ошибок определяются в errors.js подсистем
     - Агрегируются в общий ERROR_CODES
     - Используют согласованную структуру
     - Имеют уникальные коды

   - Создание ошибок
     - Через фабричные функции error-fabs.js
     - С валидацией входных данных
     - С форматированием сообщений
     - С сохранением контекста

   - Цепочка ошибок
     - Сохранение исходной причины
     - Оборачивание в специфичные ошибки
     - Полная трассировка проблемы
     - Сохранение контекста каждого уровня

   - Валидация и безопасность
     - Проверка обязательных полей
     - Валидация форматов
     - Безопасное форматирование
     - Контроль типов данных

3. Паттерны использования

   - Определение ошибок подсистемы
     ```javascript
     // В errors-subsystem.js
     export const ERROR_CODES = {
       OPERATION_FAILED: {
         code: 'SUBSYS_OP_FAILED',
         message: 'Operation failed: {reason}',
         contextKeys: ['reason']
       }
     }
     ```

   - Создание фабричных функций
     ```javascript
     // В error-fabs-subsystem.js
     export function createOperationError(reason, originalError) {
       return createError(
         ERROR_CODES.OPERATION_FAILED,
         { reason },
         originalError
       )
     }
     ```

   - Обработка ошибок в коде
     ```javascript
     try {
       await operation()
     } catch (error) {
       throw createOperationError(
         error.message,
         error
       )
     }
     ```

   - Проверка и восстановление
     ```javascript
     try {
       await riskyOperation()
     } catch (error) {
       if (isRecoverable(error)) {
         await recover()
       } else {
         throw error
       }
     }
     ```

## Структура

### Подсистемы

Вложенных подсистем нет.

### Список файлов

src/errors/
 ├── errors.js         # Основной API подсистемы
 ├── system-error.js   # Базовый класс ошибок
 └── codes.js          # Агрегация кодов ошибок подсистем

## Общий типовой интерфейс

### Централизованная обработка ошибок (SYS_ERRORS), коды ошибок:

```
SYS_ERROR_CODES:

  // Системные ошибки
  INITIALIZATION_FAILED: Ошибка инициализации системы
    - context:
      - reason: причина ошибки

  UNEXPECTED: Непредвиденная ошибка
    - context:
      - reason: описание ошибки

  VALIDATION_FAILED: Ошибка валидации
    - context:
      - reason: причина ошибки валидации
      - problems: массив проблем
      - problemsText: текстовое описание проблем

  NOT_IMPLEMENTED: Функционал не реализован
    - context:
      - feature: название функционала

  INVALID_ARGUMENT: Некорректный аргумент
    - context:
      - name: имя аргумента
      - reason: причина некорректности
```

### Логирование (SYS_LOGGER), определены namespace:

```
(errors.js) "errors:" Основной API подсистемы
(system-error.js) "errors:system-error:" Базовый класс ошибок
```

### Общий интерфейс dependency injection

```javascript
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
export function setDependencies(newDependencies)
```

## (src/errors/errors.js) Основной модуль подсистемы

Предоставляет основной API для создания и обработки ошибок. Включает функции для создания ошибок, их валидации и проверки возможности восстановления.

### Зависимости модуля

Внешние зависимости:
- нет

Внутренние зависимости:
- './system-error.js': Базовый класс SystemError
- './codes.js': Коды ошибок ERROR_CODES 

Переменные окружения:
- NODE_ENV: Режим работы (development/production), влияет на строгость валидации

Импортированные модули подсистемы:
- system-error.js
- codes.js

### Сущности кода

```javascript
/**
 * formatMessage: Форматирует сообщение об ошибке с подстановкой контекста
 *
 * Описание: Подставляет значения из контекста в шаблон сообщения по placeholders в фигурных скобках.
 * Отвечает за создание информативных сообщений об ошибках с динамическими данными. Обрабатывает
 * отсутствующие значения и некорректные типы данных безопасным способом.
 *
 * Ожидаемое поведение:
 * - Заменяет все {placeholder} на соответствующие значения из контекста
 * - Сохраняет неизменными placeholder'ы без значений в контексте
 * - Корректно обрабатывает null и undefined значения
 * - Возвращает пустую строку для undefined template
 * - Все значения безопасно приводятся к строке через toString()
 *
 * @param {string} template - Шаблон сообщения с {placeholders}
 * @param {Object} [context] - Значения для подстановки
 * @returns {string} Отформатированное сообщение
 */
export function formatMessage(template, context = {})

/**
 * validateDefinition: Проверяет валидность определения ошибки
 *
 * Описание: Проверяет наличие и корректность обязательных полей в определении ошибки.
 * Собирает список проблем с определением для информативной обратной связи.
 * Валидация включает проверку наличия обязательных полей и формата значений.
 *
 * Ожидаемое поведение:
 * - Проверяет наличие code и message как обязательных полей
 * - Валидирует формат кода ошибки (большие буквы и подчеркивания)
 * - Возвращает массив найденных проблем
 * - Для валидного определения возвращает пустой массив
 * - Корректно обрабатывает null и undefined входные данные
 *
 * @param {Object} definition - Проверяемое определение
 * @returns {string[]} Список найденных проблем
 */
export function validateDefinition(definition)

/**
 * createError: Создает системную ошибку
 *
 * Описание: Создает экземпляр SystemError с валидацией входных данных и форматированием сообщения.
 * Является основным способом создания ошибок в системе. Поддерживает разные режимы валидации
 * и сохранение цепочки ошибок.
 *
 * Ожидаемое поведение:
 * - В строгом режиме валидирует определение и контекст
 * - Форматирует сообщение с подстановкой значений из контекста
 * - Сохраняет оригинальную ошибку для цепочки ошибок
 * - В production пропускает строгие проверки
 * - При ошибке валидации создает SystemError с кодом VALIDATION_FAILED
 * - При неожиданных ошибках создает SystemError с кодом UNEXPECTED
 *
 * @param {Object} errorDefinition - Определение ошибки из ERROR_CODES
 * @param {Object} [context] - Контекст ошибки
 * @param {Error} [originalError] - Исходная ошибка
 * @param {Object} [options] - Опции создания ошибки
 * @param {boolean} [options.strict=true] - Строгий режим валидации
 * @returns {SystemError} Системная ошибка
 * @throws {SystemError} При некорректных входных данных в строгом режиме с кодом VALIDATION_FAILED
 */
export function createError(errorDefinition, context, originalError, options)

/**
 * isError: Проверяет что ошибка определенного типа
 *
 * Описание: Проверяет принадлежность ошибки к определенному типу по коду.
 * Используется для выборочной обработки разных типов ошибок. Учитывает
 * иерархию ошибок через instanceof SystemError.
 *
 * Ожидаемое поведение:
 * - Проверяет что ошибка является SystemError через instanceof
 * - Сверяет код ошибки с определением
 * - Возвращает true только при полном соответствии
 * - Возвращает false для null/undefined error или definition
 * - Возвращает false для обычных Error
 *
 * @param {Error} error - Проверяемая ошибка
 * @param {Object} errorDefinition - Определение ошибки из ERROR_CODES
 * @returns {boolean} true если ошибка соответствует определению
 */
export function isError(error, errorDefinition)

/**
 * isRecoverable: Проверяет можно ли восстановиться после ошибки
 *
 * Описание: Определяет возможность восстановления после ошибки по флагу recoverable.
 * Помогает принять решение о стратегии обработки ошибки. Все неизвестные типы
 * ошибок считаются восстанавливаемыми.
 *
 * Ожидаемое поведение:
 * - Для SystemError возвращает значение флага recoverable
 * - Для остальных ошибок возвращает true
 * - Для null/undefined возвращает true
 * - Для ошибок без флага recoverable возвращает true
 *
 * @param {Error} error - Проверяемая ошибка
 * @returns {boolean} true если можно восстановиться
 */
export function isRecoverable(error)

// Реэкспорт базовых сущностей
export { SystemError } from './system-error.js'
export { ERROR_CODES } from './codes.js'
```

## (src/errors/system-error.js) Базовый класс ошибок

Базовый класс для всех системных ошибок. Расширяет стандартный Error дополнительными метаданными и функциональностью.

### Зависимости модуля

Внешние зависимости:
- нет

Внутренние зависимости:
- нет

Переменные окружения:
- NODE_ENV: Режим работы (development/production), влияет на строгость валидации

### Сущности кода

```javascript
/**
 * SystemError: Базовый класс системных ошибок
 *
 * Описание: Расширяет стандартный Error для хранения метаданных об ошибке,
 * форматирования сообщений и сохранения цепочки ошибок. Обеспечивает валидацию
 * данных и сериализацию для логирования. Является базовым классом для всех
 * ошибок в системе.
 *
 * Ожидаемое поведение:
 * - В строгом режиме валидирует все входные данные
 * - Форматирует сообщение с подстановкой контекста
 * - Сохраняет все метаданные об ошибке
 * - Поддерживает цепочку ошибок через originalError
 * - Обеспечивает форматирование для вывода
 * - Предоставляет сериализацию для логирования
 * - При неверных входных данных выбрасывает Error
 *
 * @class
 * @extends Error
 */
export class SystemError extends Error {
  /**
   * Создает экземпляр системной ошибки
   *
   * @param {Object} definition - Определение ошибки
   * @param {string} definition.code - Код ошибки
   * @param {string} definition.message - Шаблон сообщения
   * @param {string} definition.subsystem - Подсистема
   * @param {boolean} [definition.recoverable] - Можно ли восстановиться
   * @param {string[]} [definition.contextKeys] - Обязательные ключи контекста
   * @param {string} [definition.docs] - Ссылка на документацию
   * @param {Object} [context] - Контекст ошибки
   * @param {Error} [originalError] - Исходная ошибка
   * @param {Object} [options] - Опции создания ошибки
   * @param {boolean} [options.strict=true] - Строгий режим валидации
   * @throws {Error} При невалидных данных в строгом режиме
   */
  constructor(definition, context, originalError, options)

  /**
   * format: Форматирует ошибку для вывода пользователю
   *
   * Описание: Создает читаемое представление ошибки для пользователя, 
   * включая всю доступную информацию об ошибке. Формирует многострочное
   * сообщение с основной информацией и дополнительными деталями.
   *
   * Ожидаемое поведение:
   * - Включает основное сообщение об ошибке
   * - Добавляет ссылку на документацию если есть
   * - Добавляет информацию об исходной ошибке
   * - Форматирует текст с переносами строк
   * - Возвращает готовую строку для вывода
   *
   * @returns {string} Отформатированное сообщение об ошибке
   */
  format()

  /**
   * toJSON: Сериализует ошибку для логирования
   * 
   * Описание: Создает объект с полным набором метаданных об ошибке для
   * логирования. Включает всю доступную информацию, необходимую для отладки
   * и анализа проблемы.
   *
   * Ожидаемое поведение:
   * - Включает все метаданные ошибки (name, code, message)
   * - Добавляет информацию о подсистеме
   * - Сериализует весь контекст ошибки
   * - Сохраняет recoverable флаг
   * - Включает ссылку на документацию
   * - Добавляет полный стек вызовов
   * - При наличии оригинальной ошибки включает её сообщение и стек
   *
   * @returns {Object} Сериализованное представление ошибки
   */
  toJSON()
}
```

## (src/errors/codes.js) Агрегация кодов ошибок

Модуль собирает и экспортирует коды ошибок всех подсистем. Служит центральной точкой для определения типов ошибок.

### Зависимости модуля

Внешние зависимости:
- нет

Внутренние зависимости:
- '../database/errors-database.js': DATABASE_ERROR_CODES
- '../logger/errors-logger.js': LOGGER_ERROR_CODES
- '../cli/errors-cli.js': CLI_ERROR_CODES
- '../file-scanner/errors-file-scanner.js': SCANNER_ERROR_CODES

Переменные окружения:
- нет

### Сущности кода

```javascript
/**
 * ERROR_CODES: Коды ошибок всех подсистем
 *
 * Описание: Агрегирует коды ошибок из всех подсистем в единую структуру.
 * Каждая подсистема определяет свои коды в отдельном файле errors-(subsystem).js
 * и экспортирует их для централизованного доступа. Структура организована
 * иерархически по подсистемам.
 *
 * Ожидаемое поведение:
 * - Предоставляет доступ ко всем кодам ошибок через единую точку
 * - Группирует коды по подсистемам для удобной навигации
 * - Обеспечивает уникальность кодов через префиксы подсистем
 * - Поддерживает единый формат определения ошибок
 * - Хранит общесистемные ошибки в секции SYS
 * 
 * Структура кодов:
 * - SYS: Общесистемные ошибки
 * - SYS_DB: Ошибки базы данных
 * - SYS_LOGGER: Ошибки логирования
 * - SYS_CLI: Ошибки командной строки
 * - SYS_FILESCANNER: Ошибки сканера файлов
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
  },

  // Коды ошибок подсистем
  SYS_DB: DATABASE_ERROR_CODES,
  SYS_LOGGER: LOGGER_ERROR_CODES,
  SYS_CLI: CLI_ERROR_CODES,
  SYS_FILESCANNER: SCANNER_ERROR_CODES
}
```

