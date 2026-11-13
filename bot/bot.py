# Telegram-бот: открывает карту столовых и коворкингов МАИ (Mini App).
#
# Запуск:
#   pip install -r bot/requirements.txt
#   BOT_TOKEN=123:abc WEBAPP_URL=https://<логин>.github.io/<репозиторий>/ python bot/bot.py
#
# Бот проекта: @StolovayaMAI_bot. Токен не храните в коде и не отправляйте в git.
# Ссылка t.me/StolovayaMAI_bot?start=place_3 откроет сразу карточку места № 3 (удобно для QR-кодов).

import asyncio
import os

from aiogram import Bot, Dispatcher
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp, Message, WebAppInfo

BOT_TOKEN = os.environ["BOT_TOKEN"]
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://egorpozdnyakov.github.io/mai_navigation_bot/")

dp = Dispatcher()


def map_button(text, url):
    """Кнопка под сообщением, которая открывает приложение внутри Telegram."""
    button = InlineKeyboardButton(text=text, web_app=WebAppInfo(url=url))
    return InlineKeyboardMarkup(inline_keyboard=[[button]])


@dp.message(CommandStart())
async def start(message: Message, command: CommandObject):
    # /start place_3 — пришли по ссылке или QR-коду конкретного места.
    if command.args and command.args.startswith("place_") and command.args[6:].isdigit():
        place_id = command.args[6:]
        await message.answer(
            f"Место № {place_id} на карте МАИ:",
            reply_markup=map_button("📍 Показать на карте", f"{WEBAPP_URL}?place={place_id}"),
        )
        return
    await message.answer(
        "Привет! Это карта столовых, буфетов, кафе и коворкингов МАИ.\n"
        "Можно узнать, что открыто сейчас, посмотреть меню и построить маршрут.\n\n"
        "Это студенческий проект, а не официальный сервис МАИ.",
        reply_markup=map_button("🗺 Открыть карту", WEBAPP_URL),
    )


@dp.message(Command("help"))
async def help_command(message: Message):
    await message.answer(
        "/start — открыть карту\n"
        "Нажмите на метку на карте, чтобы увидеть часы работы, цены и меню.\n"
        "Нашли ошибку в данных? Напишите авторам проекта."
    )


async def main():
    bot = Bot(BOT_TOKEN)
    # Кнопка «Карта» слева от поля ввода во всех чатах с ботом.
    await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(text="Карта", web_app=WebAppInfo(url=WEBAPP_URL)))
    print("Бот запущен. Остановить — Ctrl+C")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
