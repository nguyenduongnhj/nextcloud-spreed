import Vuex from 'vuex'
import { createLocalVue, shallowMount, mount, RouterLinkStub } from '@vue/test-utils'
import { cloneDeep } from 'lodash'
import storeConfig from '../../../store/storeConfig'
import { CONVERSATION, PARTICIPANT, ATTENDEE } from '../../../constants'
import ActionButton from '@nextcloud/vue/dist/Components/ActionButton'
import { showSuccess, showError } from '@nextcloud/dialogs'

import Conversation from './Conversation'

jest.mock('@nextcloud/dialogs', () => ({
	showSuccess: jest.fn(),
	showError: jest.fn(),
}))

describe('Conversation.vue', () => {
	const TOKEN = 'XXTOKENXX'
	let store
	let localVue
	let testStoreConfig
	let item
	let messagesMock

	beforeEach(() => {
		localVue = createLocalVue()
		localVue.use(Vuex)

		testStoreConfig = cloneDeep(storeConfig)
		messagesMock = jest.fn().mockReturnValue({})
		testStoreConfig.modules.messagesStore.getters.messages = () => messagesMock
		testStoreConfig.modules.actorStore.getters.getUserId = () => jest.fn().mockReturnValue('user-id-self')
		store = new Vuex.Store(testStoreConfig)

		// common defaults
		item = {
			token: TOKEN,
			actorId: 'actor-id-1',
			participants: [
			],
			participantType: PARTICIPANT.TYPE.USER,
			unreadMessages: 0,
			unreadMention: false,
			objectType: '',
			type: CONVERSATION.TYPE.GROUP,
			displayName: 'conversation one',
			isFavorite: false,
			notificationLevel: 0,
			lastMessage: {
				actorId: 'user-id-alice',
				actorDisplayName: 'Alice Wonderland',
				actorType: ATTENDEE.ACTOR_TYPE.USERS,
				message: 'hello',
				messageParameters: {},
				systemMessage: '',
				timestamp: 100,
			},
			canLeaveConversation: true,
			canDeleteConversation: true,
		}

		// hack to catch last message rendering
		const oldTee = global.t
		global.t = jest.fn().mockImplementation(function(pkg, text, data) {
			if (data && data.lastMessage) {
				return (data.actor || 'You') + ': ' + data.lastMessage
			}
			return oldTee.apply(this, arguments)
		})
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	test('renders conversation entry', () => {
		const wrapper = mount(Conversation, {
			localVue,
			store,
			stubs: {
				RouterLink: RouterLinkStub,
			},
			propsData: {
				isSearchResult: false,
				item,
			},
		})

		const el = wrapper.findComponent({ name: 'ListItem' })
		expect(el.exists()).toBe(true)
		expect(el.props('title')).toBe('conversation one')

		const icon = el.findComponent({ name: 'ConversationIcon' })
		expect(icon.props('item')).toStrictEqual(item)
		expect(icon.props('hideFavorite')).toStrictEqual(false)
		expect(icon.props('hideCall')).toStrictEqual(false)
	})

	describe('displayed subtitle', () => {
		function testConversationLabel(item, expectedText, isSearchResult = false) {
			const wrapper = mount(Conversation, {
				localVue,
				store,
				stubs: {
					RouterLink: RouterLinkStub,
				},
				propsData: {
					isSearchResult,
					item,
				},
			})

			const el = wrapper.findComponent({ name: 'ListItem' })
			expect(el.vm.$slots.subtitle[0].text.trim()).toBe(expectedText)
		}

		test('display joining conversation message when not joined yet', () => {
			item.actorId = null
			testConversationLabel(item, 'Joining conversation …')
		})

		test('displays nothing when there is no last chat message', () => {
			item.lastMessage = {}
			testConversationLabel(item, '')
		})

		describe('author name', () => {
			test('displays last chat message with shortened author name', () => {
				testConversationLabel(item, 'Alice: hello')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays last chat message with author name if no space in name', () => {
				item.lastMessage.actorDisplayName = 'Bob'
				testConversationLabel(item, 'Bob: hello')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays own last chat message with "You" as author', () => {
				item.lastMessage.actorId = 'user-id-self'

				testConversationLabel(item, 'You: hello')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays last system message without author', () => {
				item.lastMessage.message = 'Alice has joined the call'
				item.lastMessage.systemMessage = 'call_joined'

				testConversationLabel(item, 'Alice has joined the call')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays last message without author in one to one conversations', () => {
				item.type = CONVERSATION.TYPE.ONE_TO_ONE
				testConversationLabel(item, 'hello')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays own last message with "You" author in one to one conversations', () => {
				item.type = CONVERSATION.TYPE.ONE_TO_ONE
				item.lastMessage.actorId = 'user-id-self'

				testConversationLabel(item, 'You: hello')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays last guest message with default author when none set', () => {
				item.type = CONVERSATION.TYPE.PUBLIC
				item.lastMessage.actorDisplayName = ''
				item.lastMessage.actorType = ATTENDEE.ACTOR_TYPE.GUESTS

				testConversationLabel(item, 'Guest: hello')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays last message for search results', () => {
				// search results have no actor id
				item.actorId = null
				testConversationLabel(item, 'Alice: hello', true)
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})
		})

		test('replaces placeholders in rich object of last message', () => {
			item.lastMessage.message = '{file}'
			item.lastMessage.messageParameters = {
				file: {
					name: 'filename.jpg',
				},
			}

			testConversationLabel(item, 'Alice: filename.jpg')
			expect(messagesMock).toHaveBeenCalledWith(TOKEN)
		})

		describe('last message from messages store', () => {
			// see Conversation.lastChatMessage() description for the reasoning
			let displayedLastStoreMessage
			let lastMessageFromConversation

			beforeEach(() => {
				displayedLastStoreMessage = {
					id: 100,
					actorId: 'user-id-alice',
					actorDisplayName: 'Alice Wonderland',
					actorType: ATTENDEE.ACTOR_TYPE.USERS,
					message: 'hello from store',
					messageParameters: {},
					systemMessage: '',
					timestamp: 100,
				}

				lastMessageFromConversation = {
					id: 110,
					actorId: 'user-id-alice',
					actorDisplayName: 'Alice Wonderland',
					actorType: ATTENDEE.ACTOR_TYPE.USERS,
					message: 'hello from conversation',
					messageParameters: {},
					systemMessage: '',
					timestamp: 100,
				}

				item.lastMessage = lastMessageFromConversation

				messagesMock.mockClear().mockReturnValue({
					100: displayedLastStoreMessage,
				})
			})

			test('displays store message when more recent', () => {
				displayedLastStoreMessage.timestamp = 2000

				testConversationLabel(item, 'Alice: hello from store')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays conversation message when last one is a temporary command message', () => {
				messagesMock.mockClear().mockReturnValue({
					'temp-100': displayedLastStoreMessage,
				})

				displayedLastStoreMessage.timestamp = 2000
				displayedLastStoreMessage.id = 'temp-100'
				displayedLastStoreMessage.message = '/me doing things'

				testConversationLabel(item, 'Alice: hello from conversation')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays conversation message when last one is a bot message', () => {
				displayedLastStoreMessage.timestamp = 2000
				displayedLastStoreMessage.actorType = ATTENDEE.ACTOR_TYPE.BOTS

				testConversationLabel(item, 'Alice: hello from conversation')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})

			test('displays store message when last one is a changelog bot message', () => {
				displayedLastStoreMessage.timestamp = 2000
				displayedLastStoreMessage.actorType = ATTENDEE.ACTOR_TYPE.BOTS
				displayedLastStoreMessage.actorId = ATTENDEE.CHANGELOG_BOT_ID

				testConversationLabel(item, 'Alice: hello from store')
				expect(messagesMock).toHaveBeenCalledWith(TOKEN)
			})
		})
	})

	describe('unread messages counter', () => {
		function testCounter(item, expectedCounterText, expectedHighlighted) {
			const wrapper = mount(Conversation, {
				localVue,
				store,
				stubs: {
					RouterLink: RouterLinkStub,
				},
				propsData: {
					isSearchResult: false,
					item,
				},
			})

			const el = wrapper.findComponent({ name: 'ListItem' })
			expect(el.exists()).toBe(true)

			expect(el.props('counterNumber')).toBe(expectedCounterText)
			expect(el.props('counterHighlighted')).toBe(expectedHighlighted)
		}

		test('renders unread messages counter', () => {
			item.unreadMessages = 5
			testCounter(item, 5, false)
		})
		test('renders unread mentions highlighted for non one-to-one conversations', () => {
			item.unreadMessages = 5
			item.unreadMention = true
			testCounter(item, 5, true)
		})
		test('renders unread mentions always highlighted for one-to-one conversations', () => {
			item.unreadMessages = 5
			item.unreadMention = false
			item.type = CONVERSATION.TYPE.ONE_TO_ONE
			testCounter(item, 5, true)
		})

		test('does not render counter when no unread messages', () => {
			const wrapper = mount(Conversation, {
				localVue,
				store,
				stubs: {
					RouterLink: RouterLinkStub,
				},
				propsData: {
					isSearchResult: false,
					item,
				},
			})

			const el = wrapper.findComponent({ name: 'ListItem' })
			expect(el.exists()).toBe(true)

			expect(el.vm.$slots.counter).not.toBeDefined()
		})
	})

	describe('actions', () => {
		let $router

		beforeEach(() => {
			$router = { push: jest.fn() }
		})

		function findActionButton(wrapper, text) {
			const actionButtons = wrapper.findAllComponents(ActionButton)
			const items = actionButtons.filter(actionButton => {
				return actionButton.text() === text
			})
			if (!items.exists()) {
				return items
			}
			return items.at(0)
		}

		function shallowMountAndGetAction(actionName) {
			const wrapper = shallowMount(Conversation, {
				localVue,
				store: new Vuex.Store(testStoreConfig),
				mocks: {
					$router,
				},
				stubs: {
					ActionButton,
				},
				propsData: {
					isSearchResult: false,
					item,
				},
			})

			const el = wrapper.findComponent({ name: 'ListItem' })
			expect(el.exists()).toBe(true)

			return findActionButton(el, actionName)
		}

		test('forwards click event on list item', async() => {
			const wrapper = mount(Conversation, {
				localVue,
				store,
				stubs: {
					RouterLink: RouterLinkStub,
				},
				propsData: {
					isSearchResult: false,
					item,
				},
			})

			const el = wrapper.findComponent({ name: 'ListItem' })
			expect(el.exists()).toBe(true)

			await el.find('a').trigger('click')

			expect(wrapper.emitted().click).toBeTruthy()
		})

		describe('notification level', () => {
			async function testSetNotificationLevel(actionName, level) {
				const setNotificationLevelAction = jest.fn().mockResolvedValueOnce()
				testStoreConfig.modules.conversationsStore.actions.setNotificationLevel = setNotificationLevelAction

				const action = shallowMountAndGetAction(actionName)
				expect(action.exists()).toBe(true)

				await action.find('button').trigger('click')

				expect(setNotificationLevelAction).toHaveBeenCalledWith(expect.anything(), { token: TOKEN, notificationLevel: level })
			}

			test('sets notification to all messages', async() => {
				await testSetNotificationLevel('All messages', 1)
			})

			test('sets notification to at-mentions only', async() => {
				await testSetNotificationLevel('@-mentions only', 2)
			})

			test('sets notification to off', async() => {
				await testSetNotificationLevel('Off', 3)
			})
		})

		describe('leaving conversation', () => {
			test('leaves conversation', async() => {
				const actionHandler = jest.fn()
				testStoreConfig.modules.participantsStore.actions.removeCurrentUserFromConversation = actionHandler

				const action = shallowMountAndGetAction('Leave conversation')
				expect(action.exists()).toBe(true)

				await action.find('button').trigger('click')

				expect(actionHandler).toHaveBeenCalledWith(expect.anything(), { token: TOKEN })
			})

			test('hides "leave conversation" action when not allowed', async() => {
				item.canLeaveConversation = false

				const action = shallowMountAndGetAction('Leave conversation')
				expect(action.exists()).toBe(false)
			})

			test('errors with notification when a new moderator is required before leaving', async() => {
				const actionHandler = jest.fn().mockRejectedValueOnce({
					response: {
						status: 400,
					},
				})
				testStoreConfig.modules.participantsStore.actions.removeCurrentUserFromConversation = actionHandler

				const action = shallowMountAndGetAction('Leave conversation')
				expect(action.exists()).toBe(true)

				await action.find('button').trigger('click')

				expect(actionHandler).toHaveBeenCalledWith(expect.anything(), { token: TOKEN })
				expect(showError).toHaveBeenCalledWith(expect.stringContaining('promote'))
			})
		})

		describe('deleting conversation', () => {
			test('deletes conversation when confirmed', async() => {
				const actionHandler = jest.fn().mockResolvedValueOnce()
				const updateTokenAction = jest.fn()
				testStoreConfig.modules.conversationsStore.actions.deleteConversationFromServer = actionHandler
				testStoreConfig.modules.tokenStore.getters.getToken = jest.fn().mockReturnValue(() => 'another-token')
				testStoreConfig.modules.tokenStore.actions.updateToken = updateTokenAction

				OC.dialogs.confirm = jest.fn()

				const action = shallowMountAndGetAction('Delete conversation')
				expect(action.exists()).toBe(true)

				await action.find('button').trigger('click')

				expect(OC.dialogs.confirm).toHaveBeenCalled()

				// call callback directly
				OC.dialogs.confirm.mock.calls[0][2](true)

				expect(actionHandler).toHaveBeenCalledWith(expect.anything(), { token: TOKEN })
				expect($router.push).not.toHaveBeenCalled()
				expect(updateTokenAction).not.toHaveBeenCalled()
			})

			test('does not delete conversation when not confirmed', async() => {
				const actionHandler = jest.fn().mockResolvedValueOnce()
				const updateTokenAction = jest.fn()
				testStoreConfig.modules.conversationsStore.actions.deleteConversationFromServer = actionHandler
				testStoreConfig.modules.tokenStore.getters.getToken = jest.fn().mockReturnValue(() => 'another-token')
				testStoreConfig.modules.tokenStore.actions.updateToken = updateTokenAction

				OC.dialogs.confirm = jest.fn()

				const action = shallowMountAndGetAction('Delete conversation')
				expect(action.exists()).toBe(true)

				await action.find('button').trigger('click')

				expect(OC.dialogs.confirm).toHaveBeenCalled()

				// call callback directly
				OC.dialogs.confirm.mock.calls[0][2](false)

				expect(actionHandler).not.toHaveBeenCalled()
				expect($router.push).not.toHaveBeenCalled()
				expect(updateTokenAction).not.toHaveBeenCalled()
			})

			test('hides "delete conversation" action when not allowed', async() => {
				item.canDeleteConversation = false

				const action = shallowMountAndGetAction('Delete conversation')
				expect(action.exists()).toBe(false)
			})
		})

		test('copies link conversation', async() => {
			const copyTextMock = jest.fn().mockResolvedValueOnce()
			const wrapper = shallowMount(Conversation, {
				localVue,
				store: new Vuex.Store(testStoreConfig),
				mocks: {
					$copyText: copyTextMock,
				},
				stubs: {
					ActionButton,
				},
				propsData: {
					isSearchResult: false,
					item,
				},
			})

			const el = wrapper.findComponent({ name: 'ListItem' })
			expect(el.exists()).toBe(true)

			const action = findActionButton(el, 'Copy link')
			expect(action.exists()).toBe(true)

			await action.find('button').trigger('click')

			await action.vm.$nextTick()

			expect(copyTextMock).toHaveBeenCalledWith('http://localhost/nc-webroot/call/XXTOKENXX')
			expect(showSuccess).toHaveBeenCalled()
		})
		test('sets favorite', async() => {
			const toggleFavoriteAction = jest.fn().mockResolvedValueOnce()
			testStoreConfig.modules.conversationsStore.actions.toggleFavorite = toggleFavoriteAction

			const wrapper = shallowMount(Conversation, {
				localVue,
				store: new Vuex.Store(testStoreConfig),
				stubs: {
					ActionButton,
				},
				propsData: {
					isSearchResult: false,
					item,
				},
			})

			const el = wrapper.findComponent({ name: 'ListItem' })
			expect(el.exists()).toBe(true)

			const action = findActionButton(el, 'Add to favorites')
			expect(action.exists()).toBe(true)

			expect(findActionButton(el, 'Remove from favorites').exists()).toBe(false)

			await action.find('button').trigger('click')

			expect(toggleFavoriteAction).toHaveBeenCalledWith(expect.anything(), item)
		})

		test('unsets favorite', async() => {
			const toggleFavoriteAction = jest.fn().mockResolvedValueOnce()
			testStoreConfig.modules.conversationsStore.actions.toggleFavorite = toggleFavoriteAction

			item.isFavorite = true

			const wrapper = shallowMount(Conversation, {
				localVue,
				store: new Vuex.Store(testStoreConfig),
				stubs: {
					ActionButton,
				},
				propsData: {
					isSearchResult: false,
					item,
				},
			})

			const el = wrapper.findComponent({ name: 'ListItem' })
			expect(el.exists()).toBe(true)

			const action = findActionButton(el, 'Remove from favorites')
			expect(action.exists()).toBe(true)

			expect(findActionButton(el, 'Add to favorites').exists()).toBe(false)

			await action.find('button').trigger('click')

			expect(toggleFavoriteAction).toHaveBeenCalledWith(expect.anything(), item)
		})
		test('marks conversation as read', async() => {
			const clearLastReadMessageAction = jest.fn().mockResolvedValueOnce()
			testStoreConfig.modules.conversationsStore.actions.clearLastReadMessage = clearLastReadMessageAction

			const action = shallowMountAndGetAction('Mark as read')
			expect(action.exists()).toBe(true)

			await action.find('button').trigger('click')

			expect(clearLastReadMessageAction).toHaveBeenCalledWith(expect.anything(), { token: item.token })
		})
		test('does not show actions for search result', () => {
			const wrapper = shallowMount(Conversation, {
				localVue,
				store: new Vuex.Store(testStoreConfig),
				stubs: {
					ActionButton,
				},
				propsData: {
					isSearchResult: true,
					item,
				},
			})

			const el = wrapper.findComponent({ name: 'ListItem' })
			expect(el.exists()).toBe(true)

			const actionButtons = wrapper.findAllComponents(ActionButton)
			expect(actionButtons.exists()).toBe(false)
		})
	})
})
