// Test Case 5 donations before rules are set
// 1. Bob donates to Alice's project in base asset
// 2. Charlie donates to Alice's project in custom asset
// 3. Alice fails to trigger pool distribution
// 4. Alice sets up rules for the project
// 5. Eva donates to Alice's project in base asset
// 6. Alice triggers pool distribution

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, BOUNCE_FEE, DONATION_STORAGE_FEE, DEFAULT_EXPENDABLE } = require('./constants')
const { calculateCommission } = require('./utils')

describe('Obyte Cascading Donations Bot Test Case 5 donations before rules are set', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.asset({ myasset: {} })
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.agent({ attestation_aa: path.join(__dirname, '../node_modules/github-attestation/github.aa') })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: DEFAULT_EXPENDABLE })
			.with.wallet({ bob: 100e9 + DEFAULT_EXPENDABLE })
			.with.wallet({ eva: 10e9 + DEFAULT_EXPENDABLE })
			.with.wallet({ charlie: { base: DEFAULT_EXPENDABLE, myasset: 10e9 } })
			.run()

		this.expenses = {
			alice: 0,
			bob: 0,
			eva: 0,
			charlie: 0
		}
	})

	it('5.0.1 Publish alice attestation profile', async () => {
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

	it('5.1.1 Bob donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*pool*base']).to.be.equal(10e9)
		expect(vars['alice/myproject*total_received*base']).to.be.equal(10e9)
	}).timeout(60000)

	it('5.2.1 Charlie donates to Alice\'s project in custom asset', async () => {
		const { unit, error } = await this.network.wallet.charlie.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: BOUNCE_FEE
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 1e9
				}
			],
			asset: this.network.asset.myasset,
			messages: [
				{
					app: 'data',
					payload_location: 'inline',
					payload: {
						donate: 1,
						repo: 'alice/myproject'
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(1e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/myproject*pool*${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject*total_received*${this.network.asset.myasset}`]).to.be.equal(1e9)
	}).timeout(60000)

	it('5.3.1 Alice fails to trigger pool distribution', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Rules for repo alice/myproject are not set yet')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*pool*base']).to.be.equal(10e9)
		expect(vars['alice/myproject*total_received*base']).to.be.equal(10e9)
		expect(vars[`alice/myproject*pool*${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject*total_received*${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars['alice/myproject*unclaimed*base']).to.be.undefined
		expect(vars[`alice/myproject*unclaimed*${this.network.asset.myasset}`]).to.be.undefined
	}).timeout(60000)

	it('5.4.1 Alice sets up rules for the project', async () => {
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
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/myproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.deep.equal({
			'repo/1': 25
		})

		expect(vars['alice/myproject*pool*base']).to.be.equal(10e9)
		expect(vars['alice/myproject*total_received*base']).to.be.equal(10e9)
		expect(vars[`alice/myproject*pool*${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject*total_received*${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars['alice/myproject*unclaimed*base']).to.be.undefined
		expect(vars[`alice/myproject*unclaimed*${this.network.asset.myasset}`]).to.be.undefined
	}).timeout(60000)

	it('5.5.1 Eva donates to Alice\'s project in base asset', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.eva += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(1e9)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*pool*base']).to.be.equal(11e9)
		expect(vars['alice/myproject*total_received*base']).to.be.equal(11e9)
		expect(vars[`alice/myproject*pool*${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject*total_received*${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars['alice/myproject*unclaimed*base']).to.be.undefined
		expect(vars[`alice/myproject*unclaimed*${this.network.asset.myasset}`]).to.be.undefined
	}).timeout(60000)

	it('5.6.1 Alice triggers pool distribution(base)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()

		expect(balanceAfterDistribute.base.pending).to.be.equal(8.25e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/myproject in asset base done')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(8.25e9)
		expect(vars['alice/myproject*pool*base']).to.be.equal(0)
		expect(vars['alice/myproject*total_received*base']).to.be.equal(11e9)
		expect(vars[`alice/myproject*pool*${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject*total_received*${this.network.asset.myasset}`]).to.be.equal(1e9)

		expect(vars['repo/1*pool*base']).to.be.equal(2.75e9)
		expect(vars['alice/myproject*to*repo/1*base']).to.be.equal(2.75e9)

		expect(vars['alice/myproject*unclaimed*base']).to.be.equal(0)
		expect(vars[`alice/myproject*unclaimed*${this.network.asset.myasset}`]).to.be.undefined

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(8.25e9 - this.expenses.alice + DEFAULT_EXPENDABLE)
	}).timeout(60000)

	it('5.6.2 Alice triggers pool distribution(myasset)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/myproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()

		expect(balanceAfterDistribute[this.network.asset.myasset].pending).to.be.equal(0.75e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/myproject in asset ${this.network.asset.myasset} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/myproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars['alice/myproject*pool*base']).to.be.equal(0)
		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(8.25e9)
		expect(vars['alice/myproject*total_received*base']).to.be.equal(11e9)
		expect(vars['repo/1*pool*base']).to.be.equal(2.75e9)
		expect(vars['alice/myproject*to*repo/1*base']).to.be.equal(2.75e9)

		expect(vars[`alice/myproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.equal(0.75e9)
		expect(vars[`alice/myproject*total_received*${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`repo/1*pool*${this.network.asset.myasset}`]).to.be.equal(0.25e9)
		expect(vars[`alice/myproject*to*repo/1*${this.network.asset.myasset}`]).to.be.equal(0.25e9)

		expect(vars['alice/myproject*unclaimed*base']).to.be.equal(0)
		expect(vars[`alice/myproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset].stable).to.be.equal(0.75e9)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
