import mockAxios from '../__mocks__/axios'
import { generateOcsUrl } from '@nextcloud/router'
import { searchPossibleConversations } from './conversationsService'
import { SHARE } from '../constants'

describe('conversationsService', () => {
	afterEach(() => {
		// cleaning up the mess left behind the previous test
		mockAxios.reset()
	})

	function testSearchPossibleConversations(token, onlyUsers, expectedShareTypes) {
		searchPossibleConversations(
			{
				searchText: 'search-text',
				token,
				onlyUsers,
			},
			{
				dummyOption: true,
			}
		)
		expect(mockAxios.get).toHaveBeenCalledWith(
			generateOcsUrl('core/autocomplete/get'),
			{
				dummyOption: true,
				params: {
					itemId: token,
					itemType: 'call',
					search: 'search-text',
					shareTypes: expectedShareTypes,
				},
			}
		)
	}

	test('searchPossibleConversations with only users', () => {
		testSearchPossibleConversations(
			'conversation-token',
			true,
			[
				SHARE.TYPE.USER,
			],
		)
	})

	test('searchPossibleConversations with other share types', () => {
		testSearchPossibleConversations(
			'conversation-token',
			false,
			[
				SHARE.TYPE.USER,
				SHARE.TYPE.GROUP,
				SHARE.TYPE.CIRCLE,
				SHARE.TYPE.EMAIL,
			],
		)
	})

	test('searchPossibleConversations with other share types and a new token', () => {
		testSearchPossibleConversations(
			'new',
			false,
			[
				SHARE.TYPE.USER,
				SHARE.TYPE.GROUP,
				SHARE.TYPE.CIRCLE,
			],
		)
	})
})
