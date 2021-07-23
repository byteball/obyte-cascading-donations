// Test Case 10 Multiple donations(base)
// 0. Publish alice attestation profile
// 1. Bob donates 1e9 to alice/aliceproject in base
// 2. Alice sets up project rules
// 	rules: {
// 		'repo/1': 5,
// 		'repo/2': 12.5,
// 		'repo/3': 33
// 	}
// 3. Trigger aliceproject distribution
// 4. Eva donates 10e9 to alice/aliceproject in base
// 5. Charlie donates 5e9 to alice/aliceproject in base
// 6. Alice triggers aliceproject distribution
// 7. Bob donates 8e9 to alice/aliceproject in base
// 8. Eva donates 3e9 to alice/aliceproject in base
// 9. Charlie donates 9e9 to alice/aliceproject in base
// 10. Alice triggers aliceproject distribution
// 11. Check Alice balances
// 12. Check aliceproject state vars

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, BOUNCE_FEE, DEFAULT_EXPENDABLE, DONATION_STORAGE_FEE } = require('./constants')
const { calculateCommission } = require('./utils')

describe('Obyte Cascading Donations Bot Test Case 10 Multiple donations(base)', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: DEFAULT_EXPENDABLE })
			.with.wallet({ bob: 100e9 + DEFAULT_EXPENDABLE })
			.with.wallet({ eva: 100e9 + DEFAULT_EXPENDABLE })
			.with.wallet({ charlie: 100e9 + DEFAULT_EXPENDABLE })
			.run()

		this.expenses = {
			alice: 0,
			bob: 0,
			eva: 0,
			charlie: 0
		}
	})

	it('10.0.1 Publish alice attestation profile', async () => {
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

	it('10.1.1 Bob donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(1e9)
	}).timeout(60000)

	it('10.2.1 Alice sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject',
				rules: {
					'repo/1': 5,
					'repo/2': 12.5,
					'repo/3': 33
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/aliceproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*rules']).to.be.deep.equal({
			'repo/1': 5,
			'repo/2': 12.5,
			'repo/3': 33
		})
	}).timeout(60000)

	it('10.3.1 Trigger aliceproject distribution', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')
	}).timeout(60000)

	it('10.4.1 Eva donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.eva += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)
	}).timeout(60000)

	it('10.5.1 Charlie donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 5e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(5e9)
	}).timeout(60000)

	it('10.6.1 Trigger aliceproject distribution', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')
	}).timeout(60000)

	it('10.7.1 Bob donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 8e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(8e9)
	}).timeout(60000)

	it('10.8.1 Eva donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 3e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.eva += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(3e9)
	}).timeout(60000)

	it('10.9.1 Charlie donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 9e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(9e9)
	}).timeout(60000)

	it('10.10.1 Trigger aliceproject distribution', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')
	}).timeout(60000)

	it('10.11.1 Check Alice balances', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(17.82e9 - this.expenses.alice + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('10.12.1 Check aliceproject state vars', async () => {
		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)

		expect(vars['alice/aliceproject*to*repo/1*base']).to.be.equal(1.8e9)
		expect(vars['alice/aliceproject*to*repo/2*base']).to.be.equal(4.5e9)
		expect(vars['alice/aliceproject*to*repo/3*base']).to.be.equal(11.88e9)

		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(36e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(17.82e9)

		expect(vars['repo/1*pool*base']).to.be.equal(1.8e9)
		expect(vars['repo/1*total_received*base']).to.be.equal(1.8e9)

		expect(vars['repo/2*pool*base']).to.be.equal(4.5e9)
		expect(vars['repo/2*total_received*base']).to.be.equal(4.5e9)

		expect(vars['repo/3*pool*base']).to.be.equal(11.88e9)
		expect(vars['repo/3*total_received*base']).to.be.equal(11.88e9)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
