// Test Case 16 ao and distribution(base)
// ao = attested owner

// 0. Publish alice and bob attestation profile for aliceproject
// 1. Alice sets up aliceproject rules
// 	rules: {
// 		'owner/repo20': 20,
// 		'owner/repo30': 30
// 	}
// 2. Charlie donates 10e9 to alice/aliceproject in base 1
// 3. Alice(ao) triggers distribution
// 4. Charlie donates 10e9 to alice/aliceproject in base 2
// 5. Bob(ao) triggers distribution
// 6. Charlie donates 10e9 to alice/aliceproject in base 3
// 7. Eva(not ao) triggers distribution
// 8. Eva(not ao) fails to trigger destribution(pool is empty, but unclaimed is present)
// 9. Alice(ao) claims unclaimed pool
// 10. Alice fails to trigger distribution(nothing to distribute)
// 11. Bob fails to trigger distribution(nothing to distribute)

// 12. Charlie donates 10e9 to alice/aliceproject in base 4
// 13. Alice(ao) triggers distribution with "to" option (to ao - Bob)
// 14. Charlie donates 10e9 to alice/aliceproject in base 5
// 15. Alice(ao) triggers distribution with "to" option (to not ao - Eva)

// 16. Charlie donates 10e9 to alice/aliceproject in base 6
// 17. Publish Fox attestation profile for aliceproject
// 18. Fox(ao) triggers distribution(new ao)

// 19. Check AA, alice, bob, eva, charlie, fox balances
// 20. Check projects' state vars

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, BOUNCE_FEE, DONATION_STORAGE_FEE, DEFAULT_EXPENDABLE } = require('./constants')
const { calculateCommission, calculateAAResponseCommission } = require('./utils')

describe('Obyte Cascading Donations Bot Test Case 16 ao and distribution(base)', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.agent({ attestation_aa: path.join(__dirname, '../node_modules/github-attestation/github.aa') })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: DEFAULT_EXPENDABLE })
			.with.wallet({ bob: DEFAULT_EXPENDABLE })
			.with.wallet({ eva: DEFAULT_EXPENDABLE })
			.with.wallet({ fox: DEFAULT_EXPENDABLE })
			.with.wallet({ charlie: 100e9 + DEFAULT_EXPENDABLE })
			.run()

		this.aaOwnBalance = 0
		this.expenses = {
			aa: 0,
			alice: 0,
			bob: 0,
			eva: 0,
			charlie: 0,
			fox: 0
		}
	})

	it('16.0.1 Publish alice attestation profile for aliceproject', async () => {
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

	it('16.0.2 Publish bob attestation profile for aliceproject', async () => {
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
							github_username: 'alice'
						}
					}
				},
				{
					app: 'data',
					payload: {
						address: await this.network.wallet.bob.getAddress(),
						github_username: 'alice',
					}
				},
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('16.1.1 Alice sets up aliceproject rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject',
				rules: {
					'owner/repo20': 20,
					'owner/repo30': 30
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/aliceproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*rules']).to.be.deep.equal({
			'owner/repo20': 20,
			'owner/repo30': 30
		})
	}).timeout(60000)

	it('16.2.1 Charlie donates 10e9 to alice/aliceproject in base 1', async () => {
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
		this.aaOwnBalance += DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(10e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.3.1 Alice(ao) triggers distribution', async () => {
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
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(10e9)
		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(5e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(5e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.4.1 Charlie donates 10e9 to alice/aliceproject in base 2', async () => {
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
		this.aaOwnBalance += DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(15e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)


	it('16.5.0 Commit bob\'s attestation for aliceproject', async () => {
		const { error: tt_error } = await this.network.timetravel({ shift: '3d' })
		expect(tt_error).to.be.null

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
							github_username: 'alice'
						}
					}
				},
				{
					app: 'data',
					payload: {
						address: await this.network.wallet.bob.getAddress(),
						github_username: 'alice',
					}
				},
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)
	
	it('16.5.1 Bob(ao) triggers distribution', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
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
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(bobAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(20e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(10e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.6.1 Charlie donates 10e9 to alice/aliceproject in base 3', async () => {
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
		this.aaOwnBalance += DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(20e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.7.1 Eva(not ao) triggers distribution', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
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
		this.expenses.eva += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(response.response.responseVars.claimer).to.be.undefined
		expect(response.response.responseVars.claimed).to.be.undefined
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(5e9)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(30e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(20e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.8.1 Eva(not ao) fails to trigger destribution(pool is empty, but unclaimed is present)', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
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
		this.expenses.eva += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nothing to distribute in repo alice/aliceproject for asset base')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(5e9)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(30e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(20e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.9.0.1 Publish alice attestation profile for aliceproject again', async () => {
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

	it('16.9.0.2 Commit alice\'s attestation for aliceproject', async () => {
		const { error: tt_error } = await this.network.timetravel({ shift: '3d' })
		expect(tt_error).to.be.null

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

	it('16.9.1 Alice(ao) claims unclaimed pool', async () => {
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
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(30e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(10e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(15e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.10.1 Alice fails to trigger distribution(nothing to distribute)', async () => {
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
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nothing to distribute in repo alice/aliceproject for asset base')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(30e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(10e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(15e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.11.1 Bob fails to trigger distribution(nothing to distribute)', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
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
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nothing to distribute in repo alice/aliceproject for asset base')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(30e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(10e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(15e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.12.1 Charlie donates 10e9 to alice/aliceproject in base 4', async () => {
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
		this.aaOwnBalance += DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(25e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.13.1 Alice(ao) triggers distribution with "to" option (to ao - Bob)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				to: await this.network.wallet.bob.getAddress()
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(bobAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(40e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(15e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(20e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.14.1 Charlie donates 10e9 to alice/aliceproject in base 5', async () => {
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
		this.aaOwnBalance += DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(30e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.15.1 Alice(ao) triggers distribution with "to" option (to not ao - Eva)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				to: await this.network.wallet.eva.getAddress()
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(evaAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(50e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(20e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(25e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.16.1 Charlie donates 10e9 to alice/aliceproject in base 6', async () => {
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
		this.aaOwnBalance += DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(35e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.17.1 Publish Fox attestation profile for aliceproject', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			outputs_by_asset: {
				base: [{address: this.network.agent.attestation_aa, amount: BOUNCE_FEE}]
			},
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.fox.getAddress(),
						profile: {
							github_username: 'alice'
						}
					}
				},
				{
					app: 'data',
					payload: {
						address: await this.network.wallet.fox.getAddress(),
						github_username: 'alice',
					}
				},
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('16.17.2 Commit Fox\'s attestation for aliceproject', async () => {
		const { error: tt_error } = await this.network.timetravel({ shift: '3d' })
		expect(tt_error).to.be.null

		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			outputs_by_asset: {
				base: [{address: this.network.agent.attestation_aa, amount: BOUNCE_FEE}]
			},
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.fox.getAddress(),
						profile: {
							github_username: 'alice'
						}
					}
				},
				{
					app: 'data',
					payload: {
						address: await this.network.wallet.fox.getAddress(),
						github_username: 'alice',
					}
				},
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('16.18.1 Fox(ao) triggers distribution(new ao)', async () => {
		const { unit, error } = await this.network.wallet.fox.triggerAaWithData({
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
		this.expenses.fox += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()
		const foxAddress = await this.network.wallet.fox.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(foxAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(60e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(20e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.undefined
		expect(vars[`paid_to*${foxAddress}*base`]).to.be.equal(5e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(30e9 + this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('16.19.1 Check AA balance', async () => {
		const balance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(30e9 + 11 * BOUNCE_FEE + 6 * DONATION_STORAGE_FEE - this.expenses.aa)
	}).timeout(60000)

	it('16.19.2 Check alice balance', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(10e9 - this.expenses.alice + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('16.19.3 Check bob balance', async () => {
		const balance = await this.network.wallet.bob.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(10e9 - this.expenses.bob + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('16.19.3 Check eva balance', async () => {
		const balance = await this.network.wallet.eva.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(5e9 - this.expenses.eva + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('16.19.4 Check fox balance', async () => {
		const balance = await this.network.wallet.fox.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(5e9 - this.expenses.fox + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('16.19.5 Check charlie balance', async () => {
		const balance = await this.network.wallet.charlie.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(40e9 - this.expenses.charlie + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('16.20.1 Check projects\' state vars', async () => {
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()
		const foxAddress = await this.network.wallet.fox.getAddress()

		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['owner/repo20*pool*base']).to.be.equal(12e9)
		expect(vars['owner/repo30*pool*base']).to.be.equal(18e9)

		expect(vars['alice/aliceproject*to*owner/repo20*base']).to.be.equal(12e9)
		expect(vars['alice/aliceproject*to*owner/repo30*base']).to.be.equal(18e9)

		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(60e9)
		expect(vars['owner/repo20*total_received*base']).to.be.equal(12e9)
		expect(vars['owner/repo30*total_received*base']).to.be.equal(18e9)

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(20e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(5e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.undefined
		expect(vars[`paid_to*${foxAddress}*base`]).to.be.equal(5e9)

		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['bob/bobproject*unclaimed*base']).to.be.undefined
		expect(vars['eva/evaproject*unclaimed*base']).to.be.undefined
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
