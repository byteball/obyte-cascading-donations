// Test Case 7 Nested donations 1 level(base asset)
// 0. Set up attestations for alice, bob, eva
// 1. Set up rules for alice (20% to evaproject, 30% to bobproject)
// 2. Set up empty rules for bob
// 3. Charlie donates to alice
// 4. Trigger distribution for alice/aliceproject
// 5. Trigger distribution for bob/bobproject
// 6. Eva sets up empty rules for evaproject
// 7. Trigger distribution for eva/evaproject

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, DEFAULT_EXPENDABLE, BOUNCE_FEE, DONATION_STORAGE_FEE } = require('./constants')
const { calculateCommission } = require('./utils')

describe('Obyte Cascading Donations Bot Test Case 7 Nested donations 1 level(base asset)', function () {
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

	it('7.0.1 Publish alice attestation profile', async () => {
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

	it('7.0.2 Publish bob attestation profile', async () => {
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

	it('7.0.3 Publish eva attestation profile', async () => {
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

	it('7.1.1 Set up rules for aliceproject', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject',
				rules: {
					'bob/bobproject': 30,
					'eva/evaproject': 20
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
	}).timeout(60000)

	it('7.2.1 Set up rules for bobproject', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'bob/bobproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for bob/bobproject are set')
	}).timeout(60000)

	it('7.3.1 Charlie donates to aliceproject in base asset', async () => {
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

		const charlieAddress = await this.network.wallet.charlie.getAddress()

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(100e9)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(100e9)
		expect(vars[`${charlieAddress}*to*alice/aliceproject*base`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*from*${charlieAddress}*base`]).to.be.equal(100e9)
		expect(vars['alice/aliceproject*unclaimed*base']).to.be.undefined
	}).timeout(60000)

	it('7.4.1 Trigger distribution for aliceproject(base)', async () => {
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

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(50e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(50e9)
		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(100e9)

		expect(vars['bob/bobproject*pool*base']).to.be.equal(30e9)
		expect(vars['bob/bobproject*total_received*base']).to.be.equal(30e9)
		expect(vars['alice/aliceproject*to*bob/bobproject*base']).to.be.equal(30e9)

		expect(vars['eva/evaproject*pool*base']).to.be.equal(20e9)
		expect(vars['eva/evaproject*total_received*base']).to.be.equal(20e9)
		expect(vars['alice/aliceproject*to*eva/evaproject*base']).to.be.equal(20e9)
		expect(vars['eva/evaproject*from*alice/aliceproject*base']).to.be.equal(20e9)

		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['bob/bobproject*unclaimed*base']).to.be.undefined
		expect(vars['eva/evaproject*unclaimed*base']).to.be.undefined

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(50e9 - this.expenses.alice + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('7.5.1 Trigger distribution for bobproject(base)', async () => {
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

		const balanceAfterDistribute = await this.network.wallet.bob.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(30e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo bob/bobproject in asset base done')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)

		const bobAddress = await this.network.wallet.bob.getAddress()
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(50e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(30e9)

		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(100e9)

		expect(vars['bob/bobproject*pool*base']).to.be.equal(0)
		expect(vars['bob/bobproject*total_received*base']).to.be.equal(30e9)
		expect(vars['alice/aliceproject*to*bob/bobproject*base']).to.be.equal(30e9)

		expect(vars['eva/evaproject*pool*base']).to.be.equal(20e9)
		expect(vars['eva/evaproject*total_received*base']).to.be.equal(20e9)
		expect(vars['alice/aliceproject*to*eva/evaproject*base']).to.be.equal(20e9)

		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['bob/bobproject*unclaimed*base']).to.be.equal(0)
		expect(vars['eva/evaproject*unclaimed*base']).to.be.undefined

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.bob.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(30e9 - this.expenses.bob + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('7.6.1 Set up rules for evaproject', async () => {
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
	}).timeout(60000)

	it('7.7.1 Trigger distribution for evaproject(base)', async () => {
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

		const balanceAfterDistribute = await this.network.wallet.eva.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(20e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo eva/evaproject in asset base done')

		const { vars } = await this.network.wallet.eva.readAAStateVars(this.network.agent.cascadingDonations)

		const bobAddress = await this.network.wallet.bob.getAddress()
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(50e9)
		expect(vars[`paid_to*${bobAddress}*base`]).to.be.equal(30e9)
		expect(vars[`paid_to*${evaAddress}*base`]).to.be.equal(20e9)

		expect(vars['alice/aliceproject*pool*base']).to.be.equal(0)
		expect(vars['alice/aliceproject*total_received*base']).to.be.equal(100e9)

		expect(vars['bob/bobproject*pool*base']).to.be.equal(0)
		expect(vars['bob/bobproject*total_received*base']).to.be.equal(30e9)
		expect(vars['alice/aliceproject*to*bob/bobproject*base']).to.be.equal(30e9)

		expect(vars['eva/evaproject*pool*base']).to.be.equal(0)
		expect(vars['eva/evaproject*total_received*base']).to.be.equal(20e9)
		expect(vars['alice/aliceproject*to*eva/evaproject*base']).to.be.equal(20e9)

		expect(vars['alice/aliceproject*unclaimed*base']).to.be.equal(0)
		expect(vars['bob/bobproject*unclaimed*base']).to.be.equal(0)
		expect(vars['eva/evaproject*unclaimed*base']).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.eva.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(20e9 - this.expenses.eva + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
