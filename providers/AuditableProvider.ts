import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class AuditableProvider {
  constructor(protected app: ApplicationContract) {}

  public register() {
    this.app.singleton('Adonis/Traits/Auditable', () => {
      const Auditable = require('../src/Auditable').default
      return new Auditable()
    })
    this.app.alias('Adonis/Traits/Auditable', 'Auditable')
  }

  public boot() {
    this.app.container.withBindings(
      ['Adonis/Core/Server', 'Adonis/Core/HttpContext', 'Adonis/Addons/Session', 'Auditable'],
      (Server, HttpContext, Session, Auditable) => {
        HttpContext.onReady((ctx) => {
          Auditable.ctx = ctx
        })
      }
    )
  }
}
