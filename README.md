# Планер

Программа для создания печатных планеров и календарей. Выбираете месяц, год, макет, оформление и формат бумаги, а затем печатаете или сохраняете результат картинкой, PDF или таблицей.

## Скачать и запустить

Последняя версия лежит в разделе [Releases](https://github.com/Vindsark/planer/releases/latest).

| Система | Файл |
| --- | --- |
| Windows 10/11 (64 бит) | [planer-windows-amd64.exe](https://github.com/Vindsark/planer/releases/latest/download/planer-windows-amd64.exe) |
| Windows на ARM | [planer-windows-arm64.exe](https://github.com/Vindsark/planer/releases/latest/download/planer-windows-arm64.exe) |
| macOS (Apple Silicon) | [planer-macos-arm64.tar.gz](https://github.com/Vindsark/planer/releases/latest/download/planer-macos-arm64.tar.gz) |
| macOS (Intel) | [planer-macos-amd64.tar.gz](https://github.com/Vindsark/planer/releases/latest/download/planer-macos-amd64.tar.gz) |
| Linux (64 бит) | [planer-linux-amd64.tar.gz](https://github.com/Vindsark/planer/releases/latest/download/planer-linux-amd64.tar.gz) |
| Linux (ARM) | [planer-linux-arm64.tar.gz](https://github.com/Vindsark/planer/releases/latest/download/planer-linux-arm64.tar.gz) |
| Любая система, без установки | [planer.html](https://github.com/Vindsark/planer/releases/latest/download/planer.html) |

Скачали, запустили, и в браузере откроется планер. Устанавливать ничего не нужно. Чтобы выйти, закройте вкладку браузера или нажмите `Ctrl+C` в окне программы.

Файл `planer.html` работает сам по себе: откройте его двойным щелчком. Настройки и заметки в этом случае хранятся в браузере.

**Windows.** Если SmartScreen показывает предупреждение, нажмите «Подробнее» → «Выполнить в любом случае».

**macOS и Linux.** Распакуйте архив и запустите файл в терминале:

```bash
tar -xzf planer-macos-arm64.tar.gz
./planer
```

На macOS, если система блокирует запуск, снимите карантин:

```bash
xattr -d com.apple.quarantine ./planer
```

## Возможности

- Макеты: месяц сеткой, месяц с блоком заметок, весь год на одной странице, неделя.
- Любой месяц и любой год, переключение стрелками и клавишами `←` `→`.
- Форматы бумаги: A3, A4, A5, A6, B4, B5, Letter, Legal, Tabloid, Executive и свой размер в миллиметрах. Ориентация и поля настраиваются.
- Календарь на 10 языках, начало недели с понедельника, воскресенья или субботы, номера недель.
- Отметки праздников для России, Украины, Беларуси и США.
- 8 цветовых схем, выбор цвета акцента, 9 готовых фонов и своя картинка. Яркость фона и заливка ячеек регулируются.
- Заметки: нажмите на любой день, впишите текст и настройте его вид. Размер, цвет, жирный и курсив, выравнивание, положение в ячейке и сдвиг видны сразу в предпросмотре. Кнопка «Вписать» подбирает самый крупный размер, при котором текст помещается. Общий ползунок «Размер текста» увеличивает все заметки разом. Заметки попадают в печать и во все файлы.
- Печать на любой размер бумаги, в том числе сразу весь год.
- Сохранение в PNG, JPG, PDF, SVG, Excel (`.xlsx`) и CSV. Для всего года картинки сохраняются архивом.

Чтобы получить PDF с настоящим текстом, нажмите «Печать» и выберите «Сохранить как PDF». Кнопка PDF в панели сохраняет страницы картинками в выбранном качестве.

## Где хранятся данные

Настройки и заметки сохраняются автоматически в файл `state.json`:

- Windows: `%AppData%\planer`
- macOS: `~/Library/Application Support/planer`
- Linux: `~/.config/planer`

Заметки можно выгрузить в файл и загрузить обратно в разделе «Заметки».

## Сборка из исходников

Нужен Go 1.22 или новее.

```bash
./scripts/build.sh
```

Готовые файлы появятся в папке `dist`. Для запуска без сборки:

```bash
go run .
```

Опции запуска: `-port` задаёт предпочтительный порт, `-no-browser` отключает автоматическое открытие браузера.

## Лицензия

MIT, см. [LICENSE](LICENSE).
