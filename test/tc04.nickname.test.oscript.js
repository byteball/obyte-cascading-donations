// Test Case 4 Donor nickname set up
// 1. Alice sets up a nickname
// 2. Alice resets a nickname
// 3. Alice fails to set invalid nickname
// 4. Bob fails to claim already taken nickname
// 5. Bob claims old alice's nickname

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, BOUNCE_FEE } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 4 Donor nickname set up', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 100e9 })
			.with.wallet({ bob: 100e9 })
			.run()
	})

	it('4.1.1 Alice sets up a nickname', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				nickname: 'TheDonor'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false

		const aliceAddress = await this.network.wallet.alice.getAddress()
		expect(response.response.responseVars.message).to.be.equal(`Nickname for ${aliceAddress} is now TheDonor`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`nickname*${aliceAddress}`]).to.be.equal('TheDonor')
		expect(vars['nickname_owner*TheDonor']).to.be.equal(aliceAddress)
	}).timeout(60000)

	it('4.2.1 Alice resets a nickname', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				nickname: 'AnotherNickname'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false

		const aliceAddress = await this.network.wallet.alice.getAddress()
		expect(response.response.responseVars.message).to.be.equal(`Nickname for ${aliceAddress} is now AnotherNickname`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`nickname*${aliceAddress}`]).to.be.equal('AnotherNickname')
		expect(vars['nickname_owner*AnotherNickname']).to.be.equal(aliceAddress)
		expect(vars['nickname_owner*TheDonor']).to.be.undefined
	}).timeout(60000)

	it('4.3.1 Alice fails to set invalid nickname(number)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				nickname: 123
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nickname is not a string')
	}).timeout(60000)

	it('4.3.2 Alice fails to set invalid nickname(boolean)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				nickname: true
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nickname is not a string')
	}).timeout(60000)

	it('4.3.3 Alice fails to set invalid nickname(object)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				nickname: { a: 123 }
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nickname is not a string')
	}).timeout(60000)

	it('4.3.4 Alice fails to set invalid nickname(array)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				nickname: [1, 2, 3]
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nickname is not a string')
	}).timeout(60000)

	it('4.4.1 Bob fails to claim already taken nickname', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				nickname: 'AnotherNickname'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nickname AnotherNickname is already taken')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`nickname*${aliceAddress}`]).to.be.equal('AnotherNickname')
		expect(vars['nickname_owner*AnotherNickname']).to.be.equal(aliceAddress)

		expect(vars[`nickname*${bobAddress}`]).to.be.undefined
	}).timeout(60000)

	it('4.5.1 Bob claims old alice\'s nickname', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				nickname: 'TheDonor'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		expect(response.response.responseVars.message).to.be.equal(`Nickname for ${bobAddress} is now TheDonor`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`nickname*${bobAddress}`]).to.be.equal('TheDonor')
		expect(vars['nickname_owner*TheDonor']).to.be.equal(bobAddress)

		expect(vars[`nickname*${aliceAddress}`]).to.be.equal('AnotherNickname')
		expect(vars['nickname_owner*AnotherNickname']).to.be.equal(aliceAddress)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
