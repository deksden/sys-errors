# Подсистема обработки ошибок (docs/errors/DOC_SYS_ERRORS.md, v0.1.7)

## 🎯 Краткое описание

SYS_ERRORS предоставляет единый механизм для создания, обработки и форматирования ошибок в системе. 

### Основные возможности

- 🔄 Централизованное определение ошибок подсистемы
- 📝 Создание ошибок с контекстом и метаданными через фабрики функций
- ⛓️ Поддержка цепочки ошибок (error chaining)
- 📋 Поддержка паттерна "ошибка операции"
- 🎨 Форматирование сообщений с поддержкой шаблонов
- ✅ Валидация ошибок
- 📊 Сериализация для логирования
- 🔍 Интеграция с системой логирования


## 📦 Класс `SystemError`

Базовый класс для всех ошибок системы. Расширяет стандартный Error и обогащает его дополнительной функциональностью для работы с ошибками на уровне системы. Может быть создан через функцию createError. Чаще всего объект с определённым кодом ошибки создаётся через специальную функцию-фабрику ошибки, которая получает все необходимые аргументы для определения контекста ошибки.

### Свойства класса `SystemError`:

- `code`: `string` - Уникальный код ошибки (например, "SYS_VALIDATION_FAILED")
- `message`: `string` - Отформатированное сообщение об ошибке
- `msg`: `string` - Шаблон сообщения об ошибке (возможно, с ключами)
- `subsystem`: `string` - Подсистема, в которой произошла ошибка
- `context`: `Object` - Дополнительные данные об ошибке
- `recoverable`: `boolean` - Флаг возможности восстановления
- `original`: `Error` - Исходная ошибка (для цепочки ошибок)
- `docs`: `string?` - Ссылка на документацию по ошибке (опционально)

### Методы класса `SystemError`:

#### `constructor(definition, context?, originalError?, options?)`
```javascript
const error = new SystemError({
  code: 'EXAMPLE_ERROR',
  message: 'Error occurred: {reason}',
  subsystem: 'example',
  recoverable: true,
  contextKeys: ['reason']
}, {
  reason: 'invalid data'
})
```

#### `format(): string`
Возвращает форматированное представление ошибки со всей цепочкой (через свойство .original для ):
```javascript
error.format()
// Выводит:
// Error occurred: invalid data
// Context: { reason: 'invalid data' }
// From subsystem: example
// See: <link to docs if present>
// Caused by: <original error details if present>
```

#### `toJSON(): Object`
Сериализует ошибку для логирования, обрабатываются все уровни через свойство .original:
```javascript
error.toJSON()
// Возвращает:
{
  name: 'SystemError',
  code: 'EXAMPLE_ERROR',
  message: 'Error occurred: invalid data',
  subsystem: 'example',
  context: { reason: 'invalid data' },
  recoverable: true,
  docs: '...',
  stack: '...',
  original: { /* original error if present */ }
}
```

### Особенности класса `SystemError`:

1. **Форматирование сообщений**
   - Поддерживает шаблоны с плейсхолдерами: `{key}`
   - Автоматически подставляет значения из контекста
   - Безопасно обрабатывает отсутствующие значения

2. **Цепочка ошибок**
   - Сохраняет полную цепочку ошибок через параметр originalError и свойство .original
   - Каждый уровень в цепочке имеет свой контекст
   - Форматирует всю цепочку при выводе
   - Сериализует все уровни для логирования

3. **Метаданные**
   - Хранит информацию о подсистеме
   - Указывает возможность восстановления
   - Предоставляет ссылки на документацию
   - Сохраняет контекст операции

4. **Валидация**
   - Проверяет обязательные поля определения
   - Валидирует формат кода ошибки
   - Контролирует наличие required contextKeys
   - Поддерживает строгий режим проверок

## Коды ошибок подсистемы, файл errors-xxx.js

Каждая подсистема определяет свои коды ошибок в файле `errors-имя_подсистемы.js`. 

Для кодов специфических ошибок операции указываем в комментарии jsDoc для какого файла и для какой функции этот код ошибки предназначен - используем тэги @file, @function:

```javascript
// src/database/errors-database.js
export const DATABASE_ERROR_CODES = {
  CONNECTION_FAILED: {
    code: 'DB_CONNECTION_FAILED',
    message: 'Failed to connect to database at {uri}',
    subsystem: 'database',
    recoverable: true,
    contextKeys: ['uri'],
    docs: 'docs/errors/database.md#connection-failed'
  },

  /** Ошибка создания записи
   * @file: database-create-record.js
   * @function: createRecord
   */
  CREATE_RECORD_FAILED: {
    code: 'DB_CREATE_RECORD_FAILED',
    message: 'Failed to create record {record_id}',
    subsystem: 'database',
    recoverable: true,
    contextKeys: ['record_id'],
    doc: 'docs/errors/database.md#create-record-failed'
  }
  
  // ... другие коды ошибок подсистемы
}
```

## Функции-фабрики ошибок  подсистемы, файл error-fabs-xxx.js

Каждая подсистема создает фабричные функции для создания своих ошибок в файле `error-fabs-имя_подсистемы.js`. 

Для функций, которые создают специфические ошибки операции, указываем в комментарии jsDoc для какого файла и для какой функции эта ошибка создана (используем тэги @file, @function, @error-code).

Для обычных ошибок, которые могут быть выброшены в нескольких функциях, указываем код ошибки для создаваемого объекта ошибки (тэг @error-code)

Пример файла:
```javascript
// src/database/error-fabs-database.js
import { createError } from '../errors/errors.js'
import { DATABASE_ERROR_CODES } from './errors-database.js'


/** Ошибка соединения
 * @error-code: DATABASE_ERROR_CODES.CONNECTION_FAILED,
 */
export function createConnectionError(config, originalError) {
  return createError(
    DATABASE_ERROR_CODES.CONNECTION_FAILED,
    { uri: config.uri },
    originalError
  )
}

/** Ошибка создания записи
 * @file: database-create-record.js
 * @function: createRecord
 * @error-code: DATABASE_ERROR_CODES.CREATE_RECORD_FAILED
 */
export function createCreateRecordError(record_id, originalError) {
  return createError(
    DATABASE_ERROR_CODES.CREATE_RECORD_FAILED,
    { record_id },
    originalError
  )
}

```

## 🛠️ API подсистемы SYS_ERRORS, файл `errors.js`

### Функция `createError()`

Создает системную ошибку с контекстом и метаданными.

```javascript
function createError(
  errorDefinition, // Определение ошибки из ERROR_CODES
  context?,        // Дополнительные данные
  originalError?,  // Исходная ошибка для цепочки
  options?         // Опции создания
)
```

### Функция `checkErrorChain()`

Проверяет цепочку ошибок на соответствие ожидаемой схеме. Используется преимущественно в тестах.

```javascript
function checkErrorChain(
  error,            // Проверяемая ошибка
  expectedChain     // Массив ожидаемых уровней в цепочке
)
```

Параметр `expectedChain` представляет собой массив объектов с описанием каждого уровня цепочки:
```javascript
[
  { 
    code: 'ERROR_CODE',              // Ожидаемый код ошибки
    type: 'SystemError',             // Опционально: ожидаемый тип/класс
    message: 'текст или ключевые слова'  // Опционально: проверка сообщения
  },
  { 
    code: 'ANOTHER_CODE',
    message: ['ключевое', 'слово']   // Можно проверять набор ключевых слов
  }
]
```
## 📋 Системные коды ошибок, подсистема SYS_ERRORS

Базовые коды ошибок доступны в подсистеме SYS_ERRORS, файл errors.js, объект `ERROR_CODES.SYS`:

```javascript
SYS: {
  // Ошибка инициализации
  INITIALIZATION_FAILED: {
    code: 'SYS_INIT_FAILED',
    message: 'System initialization failed: {reason}'
  },

  // Непредвиденная ошибка
  UNEXPECTED: {
    code: 'SYS_UNEXPECTED',
    message: 'Unexpected error: {reason}'
  },

  // Ошибка валидации
  VALIDATION_FAILED: {
    code: 'SYS_VALIDATION_FAILED',
    message: 'Validation failed: {reason}'
  },

  // Функционал не реализован
  NOT_IMPLEMENTED: {
    code: 'SYS_NOT_IMPLEMENTED',
    message: 'Feature not implemented: {feature}'
  },

  // Некорректный аргумент
  INVALID_ARGUMENT: {
    code: 'SYS_INVALID_ARGUMENT',
    message: 'Invalid argument {name}: {reason}'
  }
}
```

## 🎯 Паттерн "создание ошибок через функцию фабрику"

- Всегда используйте специальную фабрику функцию (из error-fabs-xxx.js подсистемы) для создания определённого типа ошибки - она содержит все необходимые аргументы для контекста ошибок такого типа:
	- Предоставляйте максимально полный контекст
	- Используйте существующие коды ошибок
- При создании новых ошибок следуйте соглашениям об именовании

## 🎯 Паттерны "Цепочка ошибок", "ошибка операции"

В системе используется важный паттерн обработки ошибок - специфические ошибки операций, которые могут выстраиваться в цепочку ошибок. 

Для каждой функции, которая может выбросить ошибку, создаётся специфический код ошибки этой операции. Это касается как публичных экспортируемых функций подсистемы, так и внутренних функций. Этот код ошибки связан только с этой функцией, он уникален для функции, другие функции не использую этот специфический код ошибки. 

Специфический код ошибки операции указывается в jsDoc этой функции. Все ошибки, выбрасываемые внутри этой функции (как в нашем коде, так и во внешних зависимостях), оборачиваются в эту ошибку операции.

Например, для операции "database create" можно создать код `DATABASE_CREATE_FAILED`. 

Помимо специфической ошибки, внутри кода функции могут выбрасываться любые иные ошибки, но они все "оборачиваются" в ошибку операции, что позволяет унифицировать обработку ошибок и сохранить полную информацию об исходной причине ошибки. 

Наш код всегда выбрасывает ошибку класса SystemError через фабрику функцию. Внешние зависимости могут выбрасывать другие классы ошибок - или обычный Error или иные классы ошибок. Они также обрачиваются в ошибку операции через параметр `originalError` фабрики функции и попадают в свойство `.original` класса `SystemError`.

При сбое в функции для создания объекта ошибки класса `SystemError` всегда используется соответствующая фабрика-функция этой ошибки.  

Для тестирования цепочки ошибок можно использовать специальную функцию `checkErrorChain()`. Она позволяет проверить всю иерархию ошибок на соответствие ожидаемой структуре, включая коды ошибок, типы и содержимое сообщений. Это особенно полезно при тестировании сложных операций с глубокой вложенностью ошибок.

**Документация jsDoc**: При документировании выбрасываемых исключений в jsDoc функции, мы указываем специфическую ошибку этой операции, а также дополнительно указываем какие ошибки могут быть в original (которые выбрасываются в нашем коде). Упоминаем про ошибки из внешних модулей.  

**Дерево кодов ошибок в сложной цепочке**: Если возможна цепочка ошибок из нескольких вложенных ошибок (в случае вызова одной нашей функцией другой нашей функцией, которая обернёт ошибки в свою ошибку операции), помимо кода ошибки другой нашей функции мы указываем саму нашу функцию, чтобы можно было увидеть в её документации, какие вложенные ошибки могут быть. Также мы явно указывае мна возможность вложенных ошибок.
### Принцип работы

1. Функция, выполняющая операцию, всегда выбрасывает ошибку операции (специфический код вроде XXX_OPERATION_FAILED), все прочие ошибки оборачиваются в эту ошибку через поле .original и параметр фабрики функции originalError;
2. Исходная причина ошибки сохраняется в `.original` этой ошибки операции
3. В `original` может быть:
   - Системная ошибка (не SystemError) из внешних компонентов
   - Наша ошибка (SystemError) из валидации или проверок
4. Все "наши" ошибки класса SystemError всегда создаются через соответствующие фабрики функции из `error-fabs-` модуля подсистемы и являются SystemError

### Пример работы с БД

```javascript
// Код в Database подсистеме
async function saveObject(obj) {
  try {
    // Валидация объекта
    if (!isValid(obj)) {
      // Создаем ошибку валидации через фабрику
      throw createValidationError(obj)  // DATABASE_OBJECT_VALIDATION_FAILED
    }

    // Попытка сохранения
    await db.save(obj)
    
  } catch (error) {
    // Оборачиваем любую ошибку (валидации или БД) в ошибку операции
    throw createSaveError(obj, error)   // DATABASE_OBJECT_SAVE_FAILED
  }
}
```

### Анализ цепочки

```javascript
try {
  await database.saveObject(data)
} catch (error) {
  // error.code === 'DATABASE_OBJECT_SAVE_FAILED'
  // error.original может быть:
  // 1. Error из БД: new Error('Duplicate key')
  // 2. SystemError: DATABASE_OBJECT_VALIDATION_FAILED
  
  console.log(error.format())
  // Failed to save object: validation failed
  // Caused by: Invalid object structure
}
```

### Преимущества подхода

- Всегда понятно на каком этапе произошла ошибка (код операции)
- Сохраняется исходная причина со всеми деталями
- Можно отследить полный путь ошибки
- Упрощается логирование и отладка

### Правила использования

- Сохраняйте оригинальную ошибку через originalError
- Добавляйте контекст на каждом уровне
- Используйте фабрики ошибок подсистем
- Не теряйте информацию при оборачивании

### Обработка ошибок

- Проверяйте тип ошибки через свойство code
- Используйте isRecoverable для retry логики
- Логируйте ошибки со всем контекстом
- Обрабатывайте только известные ошибки

### Определение новых ошибок

- Создавайте файл `errors-имя_подсистемы.js`
- Определяйте осмысленные коды и сообщения
- Указывайте recoverable для автоматического восстановления
- Документируйте обязательные поля контекста

### Создание фабрик ошибок

- Создавайте файл `error-fabs-имя_подсистемы.js`
- Делайте специализированные фабрики для типовых ошибок
- Инкапсулируйте создание контекста
- Поддерживайте сохранение оригинальной ошибки

## 📚 Примеры реализации

### Использование в коде

```javascript
import { createProcessingError, createValidationError } from './error-fabs-module.js'

async function processItem(item) {
  try {
    // Валидация
    if (!isValid(item)) {
      throw createValidationError('Invalid item format')
    }

    // Обработка
    try {
      return await processItemData(item)
    } catch (error) {
      throw createProcessingError(
        item.id,
        'Data processing failed',
        error
      )
    }
  } catch (error) {
    logger.error({ error }, 'Item processing failed')
    throw error
  }
}
```
## 🎯 Сценарии использования

### Базовая обработка ошибок

```javascript
try {
  await operation()
} catch (error) {
  if (typeof error === SystemError && error?.code? === ERROR_CODES.SYS.VALIDATION_FAILED.code) {
    // Обработка ошибки валидации
    console.log('Validation error:', error.message)
  } else if (isRecoverable(error)) {
    // Попытка восстановления
    await retry(operation)
  } else {
    // Проброс остальных ошибок
    throw error
  }
}
```

### Цепочка ошибок

```javascript
async function readUserData(userId) {
  try {
    const data = await db.query('SELECT * FROM users WHERE id = ?', [userId])
    return JSON.parse(data)
  } catch (dbError) {
    // Оборачиваем ошибку БД
    const queryError = createError(
      ERROR_CODES.SYS_DB.QUERY_FAILED,
      {
        query: 'SELECT user',
        params: userId
      },
      dbError
    )

    // Оборачиваем в ошибку операции
    throw createError(
      ERROR_CODES.SYS.OPERATION_FAILED,
      {
        operation: 'readUserData',
        userId
      },
      queryError
    )
  }
}
```

### Проверка цепочки ошибок в тестах

```javascript
import { checkErrorChain } from '../errors/errors.js'

test('проверка цепочки ошибок', () => {
  try {
    await operationThatFails()
  } catch (error) {
    // Проверяем всю цепочку ошибок
    checkErrorChain(error, [
      // Верхний уровень (ошибка операции)
      { 
        code: 'MODULE_OPERATION_FAILED',
        type: 'SystemError',
        message: 'operation failed'
      },
      // Ошибка валидации внутри
      { 
        code: 'SYS_VALIDATION_FAILED',
        message: ['validation', 'failed']
      },
      // Исходная ошибка
      { 
        type: 'TypeError',
        message: 'invalid type'
      }
    ])
  }
})
```

### Интеграция с логированием

```javascript
import { createLogger } from '@fab33/sys-logger'
const logger = createLogger('module')

try {
  await operation()
} catch (error) {
  // SystemError автоматически форматируется для лога
  logger.error({ error }, 'Operation failed')
  
  // Доступна вся цепочка ошибок и контекст
  console.log(error.format())
}
```



## 🔗 Интеграция с другими подсистемами

### Логирование (SYS_LOGGER)

SystemError автоматически интегрируется с системой логирования:
- Форматирует ошибки для вывода
- Сохраняет цепочку ошибок
- Включает контекст в логи
- Поддерживает уровни логирования

```javascript
logger.error({ error }, 'Operation failed')
// {
//   level: 'error',
//   code: 'MODULE_PROCESSING_FAILED',
//   message: 'Failed to process item-123: Data processing failed',
//   context: { item: 'item-123' },
//   original: {
//     code: 'DB_QUERY_FAILED',
//     message: '...'
//   }
// }
```

## 🔍 Отладка

### Форматированный вывод

Метод `format()` предоставляет читаемый вывод всей информации об ошибке:

```javascript
console.log(error.format())
// Operation failed: Cannot process item
// Context: { item: 'test', reason: 'invalid format' }
// Caused by: Validation failed: missing required fields
// Stack trace:
//   at processItem (/src/module.js:10:12)
//   ...
```

### Анализ цепочки ошибок

```javascript
function analyzeError(error) {
  console.log('Error chain:')
  let current = error
  
  while (current) {
    console.log(`- ${current.code}: ${current.message}`)
    console.log('  Context:', current.context)
    current = current.original
  }
}
```

## 📌 Важные замечания

1. **Контекст ошибок**
   - Всегда предоставляйте полезный контекст
   - Не включайте sensitive данные
   - Используйте типизированные данные
   - Следите за размером контекста

2. **Обработка ошибок**
   - Обрабатывайте ошибки на правильном уровне
   - Не глотайте ошибки без причины
   - Всегда логируйте необработанные ошибки
   - Используйте try/catch блоки правильно

3. **Безопасность**
   - Не раскрывайте внутренние детали в сообщениях
   - Валидируйте входные данные
   - Используйте безопасное форматирование
   - Контролируйте размер логов
