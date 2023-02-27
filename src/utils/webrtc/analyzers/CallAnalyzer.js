/**
 *
 * @copyright Copyright (c) 2020, Daniel Calviño Sánchez (danxuliu@gmail.com)
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

import {
	ParticipantAnalyzer,
} from './ParticipantAnalyzer'

/**
 * Analyzer for the quality of the connections of a call.
 *
 * After a CallAnalyzer is created the analysis will be automatically started.
 *
 * When the quality of the connections change different events will be triggered
 * depending on the case:
 * - 'change:senderConnectionQualityAudio'
 * - 'change:senderConnectionQualityVideo'
 * - 'change:senderConnectionQualityScreen'
 *
 * The reported values are based on CONNECTION_QUALITY values of
 * PeerConnectionAnalyzer.
 *
 * Besides the event themselves, the quality can be known too using
 * "get(valueName)" or even directly from the "attributes" object.
 *
 * Once the CallAnalyzer is no longer needed "destroy()" must be called to stop
 * the analysis.
 *
 * @param {LocalMediaModel} localMediaModel the model for the local media.
 * @param {LocalCallParticipantModel} localCallParticipantModel the model for
 *        the local participant; null if an MCU is not used.
 * @param {CallParticipantCollection} callParticipantCollection the collection
 *        for the remote participants.
 */
export default function CallAnalyzer(localMediaModel, localCallParticipantModel, callParticipantCollection) {
	this.attributes = {
		senderConnectionQualityAudio: null,
		senderConnectionQualityVideo: null,
		senderConnectionQualityScreen: null,
	}

	this._handlers = []

	this._localMediaModel = localMediaModel
	this._localCallParticipantModel = localCallParticipantModel
	this._callParticipantCollection = callParticipantCollection

	this._handleSenderConnectionQualityAudioChangeBound = this._handleSenderConnectionQualityAudioChange.bind(this)
	this._handleSenderConnectionQualityVideoChangeBound = this._handleSenderConnectionQualityVideoChange.bind(this)
	this._handleSenderConnectionQualityScreenChangeBound = this._handleSenderConnectionQualityScreenChange.bind(this)

	if (localCallParticipantModel) {
		this._localParticipantAnalyzer = new ParticipantAnalyzer()
		this._localParticipantAnalyzer.setSenderParticipant(localMediaModel, localCallParticipantModel)

		this._localParticipantAnalyzer.on('change:senderConnectionQualityAudio', this._handleSenderConnectionQualityAudioChangeBound)
		this._localParticipantAnalyzer.on('change:senderConnectionQualityVideo', this._handleSenderConnectionQualityVideoChangeBound)
		this._localParticipantAnalyzer.on('change:senderConnectionQualityScreen', this._handleSenderConnectionQualityScreenChangeBound)
	}
}
CallAnalyzer.prototype = {

	get(key) {
		return this.attributes[key]
	},

	set(key, value) {
		this.attributes[key] = value

		this._trigger('change:' + key, [value])
	},

	on(event, handler) {
		if (!Object.prototype.hasOwnProperty.call(this._handlers, event)) {
			this._handlers[event] = [handler]
		} else {
			this._handlers[event].push(handler)
		}
	},

	off(event, handler) {
		const handlers = this._handlers[event]
		if (!handlers) {
			return
		}

		const index = handlers.indexOf(handler)
		if (index !== -1) {
			handlers.splice(index, 1)
		}
	},

	_trigger(event, args) {
		let handlers = this._handlers[event]
		if (!handlers) {
			return
		}

		args.unshift(this)

		handlers = handlers.slice(0)
		for (let i = 0; i < handlers.length; i++) {
			const handler = handlers[i]
			handler.apply(handler, args)
		}
	},

	destroy() {
		if (this._localParticipantAnalyzer) {
			this._localParticipantAnalyzer.off('change:senderConnectionQualityAudio', this._handleSenderConnectionQualityAudioChangeBound)
			this._localParticipantAnalyzer.off('change:senderConnectionQualityVideo', this._handleSenderConnectionQualityVideoChangeBound)
			this._localParticipantAnalyzer.off('change:senderConnectionQualityScreen', this._handleSenderConnectionQualityScreenChangeBound)

			this._localParticipantAnalyzer.destroy()
		}
	},

	_handleSenderConnectionQualityAudioChange(participantAnalyzer, senderConnectionQualityAudio) {
		this.set('senderConnectionQualityAudio', senderConnectionQualityAudio)
	},

	_handleSenderConnectionQualityVideoChange(participantAnalyzer, senderConnectionQualityVideo) {
		this.set('senderConnectionQualityVideo', senderConnectionQualityVideo)
	},

	_handleSenderConnectionQualityScreenChange(participantAnalyzer, senderConnectionQualityScreen) {
		this.set('senderConnectionQualityScreen', senderConnectionQualityScreen)
	},

}
