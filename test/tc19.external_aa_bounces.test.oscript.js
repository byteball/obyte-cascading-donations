// Test Case 19 external AA bounces

// 1. Trigger set rules with not enough fee
// 2. Trigger distribution rules not set
// 3. Publish attestation and set rules
// 4. Trigger donate not enough storage fee

const path = require('path')
const AA_PATH = '../agent.aa'
const TRIGGERER_PATH = './triggerer.aa'
const { ATTESTOR_MNEMONIC, DEFAULT_EXPENDABLE, BOUNCE_FEE } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 19 external AA bounces', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.agent({ triggerer: path.join(__dirname, TRIGGERER_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: DEFAULT_EXPENDABLE })
			.run()
	})

	it('19.1.1 Trigger set rules with not enough fee', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.triggerer,
			amount: 1e5,
			data: {
				set_rules: 1,
				aa: this.network.agent.cascadingDonations
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		await this.network.witnessUntilStable(response.response_unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('one of secondary AAs bounced with error: ' + this.network.agent.cascadingDonations + ': Not enough fee to pay rules storage')
	}).timeout(60000)

	it('19.2.1 Trigger distribution rules not set', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.triggerer,
			amount: 1e5,
			data: {
				distribute: 1,
				aa: this.network.agent.cascadingDonations
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		await this.network.witnessUntilStable(response.response_unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('one of secondary AAs bounced with error: ' + this.network.agent.cascadingDonations + ': Rules for repo owner/repo are not set yet')
	}).timeout(60000)

	it('19.3.1 Publish alice attestation profile for aliceproject', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.alice.getAddress(),
						profile: {
							github_username: 'owner'
						}
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('19.3.2 Alice sets up aliceproject rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'owner/repo'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('19.4.1 Trigger donate not enough storage fee', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.triggerer,
			amount: 1e5,
			data: {
				donate: 1,
				aa: this.network.agent.cascadingDonations
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		await this.network.witnessUntilStable(response.response_unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('one of secondary AAs bounced with error: ' + this.network.agent.cascadingDonations + ': Not enough fee to pay storage')
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
