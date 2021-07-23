// Test Case 12 Nested donations 2 level(base asset)
// 0. Publish alice, bob, eva attestation profile
// 1. Set up alice, bob, eva rules
// 1.1 Alice sets up project rules
// 	rules: {
// 		'bob/bobproject': 30
// 	}
// 1.2 Bob sets up project rules
// 	rules: {
// 		'eva/evaproject': 40
// 	}
// 1.3 Eva sets up project rules
// 	rules: {}
// 2. Charlie donates 10e9 to alice/aliceproject in base
// 3. Charlie donates 10e9 to bob/bobproject in base
// 4. Charlie donates 10e9 to eva/evaproject in base
// 5. Alice triggers alice/aliceproject distribution
// 6. Bob triggers bob/bobproject distribution
// 7. Eva triggers eva/evaproject distribution
// 8. Check alice, bob, eva balances
// 9. Check projects' state vars

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, DEFAULT_EXPENDABLE, DONATION_STORAGE_FEE, BOUNCE_FEE } = require('./constants')
const { calculateCommission } = require('./utils')

describe('Obyte Cascading Donations Bot Test Case 12 Nested donations 2 level(base asset)', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: DEFAULT_EXPENDABLE })
			.with.wallet({ bob: DEFAULT_EXPENDABLE })
			.with.wallet({ eva: DEFAULT_EXPENDABLE })
			.with.wallet({ charlie: 100e9 + DEFAULT_EXPENDABLE })
			.run()

		this.expenses = {
			alice: 0,
			bob: 0,
			eva: 0,
			charlie: 0
		}
	})

	it('12.0.1 Publish alice attestation profile', async () => {
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

	it('12.0.2 Publish bob attestation profile', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.bob.getAddress(),
						profile: {
							github_username: 'bob'
						}
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('12.0.3 Publish eva attestation profile', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.eva.getAddress(),
						profile: {
							github_username: 'eva'
						}
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('12.1.1 Alice sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject',
				rules: {
					'bob/bobproject': 30
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
			'bob/bobproject': 30
		})
	}).timeout(60000)

	it('12.1.2 Bob sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'bob/bobproject',
				rules: {
					'eva/evaproject': 40
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for bob/bobproject are set')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['bob/bobproject*rules']).to.be.deep.equal({
			'eva/evaproject': 40
		})
	}).timeout(60000)

	it('12.1.3 Eva sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'eva/evaproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.eva += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for eva/evaproject are set')

		const { vars } = await this.network.wallet.eva.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['eva/evaproject*rules']).to.be.deep.equal({})
	}).timeout(60000)

	it('12.2.1 Charlie donates 10e9 to alice/aliceproject in base', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)
	}).timeout(60000)

	it('12.3.1 Charlie donates 10e9 to bob/bobproject in base', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'bob/bobproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to bob/bobproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)
	}).timeout(60000)

	it('12.4.1 Charlie donates 10e9 to eva/evaproject in base', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'eva/evaproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to eva/evaproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)
	}).timeout(60000)

	it('12.5.1 Alice triggers alice/aliceproject distribution', async () => {
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

		const aliceAddress = await this.network.wallet.alice.getAddress()
		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(7e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('12.6.1 Bob triggers bob/bobproject distribution', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'bob/bobproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo bob/bobproject in asset base done')

		const bobAddress = await this.network.wallet.bob.getAddress()
		expect(response.response.responseVars.claimer).to.be.equal(bobAddress)
		expect(response.response.responseVars.claimed).to.be.equal(7.8e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('12.7.1 Eva triggers eva/evaproject distribution', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'eva/evaproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.eva += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo eva/evaproject in asset base done')

		const evaAddress = await this.network.wallet.eva.getAddress()
		expect(response.response.responseVars.claimer).to.be.equal(evaAddress)
		expect(response.response.responseVars.claimed).to.be.equal(15.2e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('12.8.1 Check Alice balances', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(7e9 - this.expenses.alice + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('12.8.2 Check Bob balances', async () => {
		const balance = await this.network.wallet.bob.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(7.8e9 - this.expenses.bob + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('12.8.3 Check Eva balances', async () => {
		const balance = await this.network.wallet.eva.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(15.2e9 - this.expenses.eva + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('12.9.1 Check projects\' state vars', async () => {
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['bob/bobproject*pool*base']).to.be.equal(0)
		expect(vars['eva/evaproject*pool*base']).to.be.equal(0)

		expect(vars['alice/aliceproject*to*bob/bobproject*base']).to.be.equal(3e9)
		expect(vars['bob/bobproject*to*eva/evaproject*base']).to.be.equal(5.2e9)

		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(10e9)
		expect(vars['bob/bobproject*total_received*base']).to.be.equal(13e9)
		expect(vars['eva/evaproject*total_received*base']).to.be.equal(15.2e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(7e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(7.8e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.equal(15.2e9)

		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['bob/bobproject*unclaimed*base']).to.be.equal(0)
		expect(vars['eva/evaproject*unclaimed*base']).to.be.equal(0)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
