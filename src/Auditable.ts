import * as _ from 'lodash'
import Audit from 'App/Models/Audit'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

class Auditable {
  public register(Model) {
    // create methods
    const self = this
    Model.audit = function () {
      return {
        create: createWithAudit(self.ctx).bind(this),
      }
    }

    // update/delete methods
    Model.prototype.audit = function () {
      return {
        update: updateWithAudit(self.ctx).bind(this),
        delete: deleteWithAudit(self.ctx).bind(this),
      }
    }
  }
}

function createWithAudit({ request, auth }: HttpContextContract): any {
  return async function (data) {
    const model = await this.create(data)
    const newModel = await this.find(model.primaryKeyValue)
    const auditable = newModel.constructor.name
    const auditableId = newModel.id
    const newData = newModel.$attributes
    const event = Audit.events.CREATE

    // save audit
    await createAudit(event, { request, auth }, auditable, auditableId, null, newData)

    return model
  }
}

function updateWithAudit({ request, auth }: HttpContextContract): any {
  return async function (data, ignoreDiff = ['updated_at']) {
    const auditable = this.constructor.name
    const auditableId = this.id
    const oldData = this.$originalAttributes
    this.merge(data)
    const result = await this.save()
    const newModel = await this.constructor.find(this.primaryKeyValue)
    const newData = newModel.$attributes

    // if new and old are equal then don't bother updating
    const isEqual = _.isEqual(_.omit(newData, ignoreDiff), _.omit(oldData, ignoreDiff))
    if (isEqual) {
      return result
    }

    // update / patch are shared
    const event = Audit.events.UPDATE

    // save audit
    await createAudit(event, { request, auth }, auditable, auditableId, oldData, newData)

    return result
  }
}

function deleteWithAudit({ request, auth }: HttpContextContract): any {
  return async function () {
    const auditable = this.constructor.name
    const auditableId = this.id
    const oldData = this.$originalAttributes
    const result = await this.delete()

    // save audit
    await createAudit(Audit.events.DELETE, { request, auth }, auditable, auditableId, oldData)

    return result
  }
}

async function createAudit(
  event: string,
  { request, auth }: HttpContextContract,
  auditable?: string,
  auditableId?: string,
  oldData?: string,
  newData?: string
): Promise<void> {
  // check request was passed
  if (!request) {
    throw new Error('Request param is empty')
  }

  // get user data to store
  const userId = auth.use('web').user?.id || undefined
  const url = request.originalUrl()
  const ip = request.ip()

  // save audit
  await Audit.create({
    user_id: userId,
    auditable_id: auditableId,
    auditable,
    event,
    url,
    ip,
    old_data: oldData,
    new_data: newData,
  })
}

module.exports = Auditable
