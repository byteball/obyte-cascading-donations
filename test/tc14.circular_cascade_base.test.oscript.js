// Test Case 14 Circular cascade
// 0. Publish alice, bob, eva attestation profile
// 1. Set up alice, bob, eva rules
// 1.1 Alice sets up project rules
// 	rules: {
// 		'bob/bobproject': 50
// 	}
// 1.2 Bob sets up project rules
// 	rules: {
// 		'eva/evaproject': 50
// 	}
// 1.3 Eva sets up project rules
// 	rules: {
// 		'alice/aliceproject': 50
// 	}
// 2. Charlie donates 100e9 to alice/aliceproject in base
// 3. Alice triggers alice/aliceproject distribution
// 4. Bob triggers bob/bobproject distribution
// 5. Eva triggers eva/evaproject distribution
// 6. Check alice, bob, eva balances
// 7. Check projects' state vars
// 8. Alice triggers alice/aliceproject distribution 2
// 9. Bob triggers bob/bobproject distribution 2
// 10. Eva triggers eva/evaproject distribution 2
// 11. Check alice, bob, eva balances
// 12. Check projects' state vars

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, BOUNCE_FEE, DEFAULT_EXPENDABLE, DONATION_STORAGE_FEE } = require('./constants')
const { calculateCommission } = require('./utils')

describe('Obyte Cascading Donations Bot Test Case 14 Circular cascade', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.agent({ attestation_aa: path.join(__dirname, '../node_modules/github-attestation/github.aa') })
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

	it('14.0.1 Publish alice attestation profile', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			outputs_by_asset: {
				base: [{address: this.network.agent.attestation_aa, amount: BOUNCE_FEE}]
			},
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
				},
				{
					app: 'data',
					payload: {
						address: await this.network.wallet.alice.getAddress(),
						github_username: 'alice',
					}
				},
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('14.0.2 Publish bob attestation profile', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			outputs_by_asset: {
				base: [{address: this.network.agent.attestation_aa, amount: BOUNCE_FEE}]
			},
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
				},
				{
					app: 'data',
					payload: {
						address: await this.network.wallet.bob.getAddress(),
						github_username: 'bob',
					}
				},
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('14.0.3 Publish eva attestation profile', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			outputs_by_asset: {
				base: [{address: this.network.agent.attestation_aa, amount: BOUNCE_FEE}]
			},
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
				},
				{
					app: 'data',
					payload: {
						address: await this.network.wallet.eva.getAddress(),
						github_username: 'eva',
					}
				},
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('14.1.1 Alice sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject',
				rules: {
					'bob/bobproject': 50
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
			'bob/bobproject': 50
		})
	}).timeout(60000)

	it('14.1.2 Bob sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'bob/bobproject',
				rules: {
					'eva/evaproject': 50
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
			'eva/evaproject': 50
		})
	}).timeout(60000)

	it('14.1.3 Eva sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'eva/evaproject',
				rules: {
					'alice/aliceproject': 50
				}
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
		expect(vars['eva/evaproject*rules']).to.be.deep.equal({
			'alice/aliceproject': 50
		})
	}).timeout(60000)

	it('14.2.1 Charlie donates 100e9 to alice/aliceproject in base', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 100e9 + DONATION_STORAGE_FEE,
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
		expect(response.response.responseVars.donated_in_base).to.be.equal(100e9)
	}).timeout(60000)

	it('14.3.1 Alice triggers alice/aliceproject distribution', async () => {
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
		expect(response.response.responseVars.claimed).to.be.equal(50e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('14.4.1 Bob triggers bob/bobproject distribution', async () => {
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
		expect(response.response.responseVars.claimed).to.be.equal(25e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('14.5.1 Eva triggers eva/evaproject distribution', async () => {
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
		expect(response.response.responseVars.claimed).to.be.equal(12.5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('14.6.1 Check Alice balances', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(50e9 - this.expenses.alice + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('14.6.2 Check Bob balances', async () => {
		const balance = await this.network.wallet.bob.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(25e9 - this.expenses.bob + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('14.6.3 Check Eva balances', async () => {
		const balance = await this.network.wallet.eva.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(12.5e9 - this.expenses.eva + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('14.7.1 Check projects\' state vars', async () => {
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(vars['alice/aliceproject*pool*base']).to.be.equal(12.5e9)
		expect(vars['bob/bobproject*pool*base']).to.be.equal(0)
		expect(vars['eva/evaproject*pool*base']).to.be.equal(0)

		expect(vars['alice/aliceproject*to*bob/bobproject*base']).to.be.equal(50e9)
		expect(vars['bob/bobproject*to*eva/evaproject*base']).to.be.equal(25e9)
		expect(vars['eva/evaproject*to*alice/aliceproject*base']).to.be.equal(12.5e9)

		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(112.5e9)
		expect(vars['bob/bobproject*total_received*base']).to.be.equal(50e9)
		expect(vars['eva/evaproject*total_received*base']).to.be.equal(25e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(50e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(25e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.equal(12.5e9)

		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['bob/bobproject*unclaimed*base']).to.be.equal(0)
		expect(vars['eva/evaproject*unclaimed*base']).to.be.equal(0)
	}).timeout(60000)

	it('14.8.1 Alice triggers alice/aliceproject distribution 2', async () => {
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
		expect(response.response.responseVars.claimed).to.be.equal(6.25e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('14.9.1 Bob triggers bob/bobproject distribution 2', async () => {
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
		expect(response.response.responseVars.claimed).to.be.equal(3.125e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('14.10.1 Eva triggers eva/evaproject distribution 2', async () => {
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
		expect(response.response.responseVars.claimed).to.be.equal(1.5625e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('14.11.1 Check Alice balances 2', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(56.25e9 - this.expenses.alice + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('14.11.2 Check Bob balances 2', async () => {
		const balance = await this.network.wallet.bob.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(28.125e9 - this.expenses.bob + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('14.11.3 Check Eva balances 2', async () => {
		const balance = await this.network.wallet.eva.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(14.0625e9 - this.expenses.eva + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('14.12.1 Check projects\' state vars 2', async () => {
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(vars['alice/aliceproject*pool*base']).to.be.equal(1.5625e9)
		expect(vars['bob/bobproject*pool*base']).to.be.equal(0)
		expect(vars['eva/evaproject*pool*base']).to.be.equal(0)

		expect(vars['alice/aliceproject*to*bob/bobproject*base']).to.be.equal(56.25e9)
		expect(vars['bob/bobproject*to*eva/evaproject*base']).to.be.equal(28.125e9)
		expect(vars['eva/evaproject*to*alice/aliceproject*base']).to.be.equal(14.0625e9)

		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(114.0625e9)
		expect(vars['bob/bobproject*total_received*base']).to.be.equal(56.25e9)
		expect(vars['eva/evaproject*total_received*base']).to.be.equal(28.125e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(56.25e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(28.125e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.equal(14.0625e9)

		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['bob/bobproject*unclaimed*base']).to.be.equal(0)
		expect(vars['eva/evaproject*unclaimed*base']).to.be.equal(0)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
