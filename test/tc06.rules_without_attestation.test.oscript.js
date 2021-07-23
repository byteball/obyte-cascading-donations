// Test Case 6 attempt to set rules without attestation
// 1. Alice attempts to set rules for a project, but has no attestation
// 2. Alice receives attestation for a project
// 3. Alice successfuly sets rules for a project

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, DEFAULT_EXPENDABLE, BOUNCE_FEE } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 6 attempt to set rules without attestation', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.asset({ myasset: {} })
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: DEFAULT_EXPENDABLE })
			.run()
	})

	it('6.1.1 Alice attempts to set rules for a project, but has no attestation', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 25
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		const aliceAddress = await this.network.wallet.alice.getAddress()
		expect(response.response.error).to.be.equal(`Address ${aliceAddress} has no attestation for alice`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*owner']).to.be.undefined
		expect(vars['alice/myproject*rules']).to.be.undefined
	}).timeout(60000)

	it('6.2.1 Alice receives attestation for a project', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.alice.getAddress(),
						profile: {
							github_username: 'alice'
						}
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('6.3.1 Alice successfuly sets rules for a project', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 25
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/myproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.deep.equal({
			'repo/1': 25
		})
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
