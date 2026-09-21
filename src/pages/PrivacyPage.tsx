import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BrandMark } from '@/components/icons/BrandMark'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-16">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark className="size-4 text-brand-400" />
            <span className="text-sm font-semibold text-ink-50">Business Financial OS</span>
          </Link>
          <Link to="/auth" className="flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-100">
            <ArrowLeft className="size-4" />
            Назад
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 text-sm text-ink-300 leading-relaxed space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50 mb-2">Политика обработки персональных данных</h1>
          <p className="text-ink-500 text-xs">Действует в отношении сервиса Business Financial OS.</p>
        </div>

        <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 px-4 py-3 text-xs text-warning-500">
          Это типовой шаблон политики по структуре 152-ФЗ «О персональных данных». Перед публичным использованием сервиса
          его должен проверить и адаптировать юрист — вписать реальные реквизиты оператора, адреса и контакты.
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink-50">1. Общие положения</h2>
          <p>
            Настоящая Политика определяет порядок обработки и защиты персональных данных пользователей сервиса
            Business Financial OS (далее — «Сервис»). Оператором персональных данных является владелец Сервиса
            (далее — «Оператор»). Используя Сервис и предоставляя свои данные при регистрации, вы соглашаетесь
            с условиями настоящей Политики.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink-50">2. Какие данные обрабатываются</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Адрес электронной почты, указанный при регистрации;</li>
            <li>Пароль (хранится в зашифрованном виде, Оператору в открытом виде недоступен);</li>
            <li>Финансовые данные бизнеса, которые пользователь вносит в Сервис самостоятельно (выручка, расходы, сотрудники и т. п.);</li>
            <li>Технические данные (IP-адрес, тип браузера) — для обеспечения работы и безопасности Сервиса.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink-50">3. Цели обработки</h2>
          <p>Персональные данные обрабатываются исключительно для целей, связанных с работой Сервиса:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>регистрация и аутентификация пользователя;</li>
            <li>синхронизация данных бизнеса между устройствами;</li>
            <li>отправка технических уведомлений, связанных с работой аккаунта;</li>
            <li>исполнение требований законодательства РФ.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink-50">4. Правовое основание</h2>
          <p>
            Обработка осуществляется с согласия пользователя, которое даётся при регистрации в Сервисе,
            в соответствии со статьёй 9 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных».
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink-50">5. Хранение и передача третьим лицам</h2>
          <p>
            Данные хранятся на серверах инфраструктурного провайдера, обеспечивающего технологическую платформу
            Сервиса. Данные не передаются третьим лицам, за исключением случаев, предусмотренных законодательством
            РФ, либо технических субподрядчиков, необходимых для работы Сервиса (хостинг, отправка писем),
            связанных обязательствами по защите данных.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink-50">6. Права пользователя</h2>
          <p>Пользователь вправе в любой момент:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>запросить у Оператора сведения об обработке своих персональных данных;</li>
            <li>потребовать уточнения, блокирования или удаления данных;</li>
            <li>отозвать согласие на обработку персональных данных, направив запрос на удаление аккаунта;</li>
            <li>обратиться в Роскомнадзор при нарушении своих прав.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink-50">7. Контакты</h2>
          <p>
            По вопросам обработки персональных данных обращайтесь по адресу электронной почты, указанному
            в разделе «Настройки» Сервиса или на сайте владельца Сервиса.
          </p>
        </section>
      </main>
    </div>
  )
}
