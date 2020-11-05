// Test Case 5 donations before rules are set
// 1. Bob donates to Alice's project in base asset
// 2. Charlie donates to Alice's project in custom asset
// 3. Alice fails to trigger pool distribution
// 4. Alice sets up rules for the project
// 5. Eva donates to Alice's project in base asset
// 6. Alice triggers pool distribution
// 7. Bob donates to Alice's project in base asset
// 8. Charlie donates to Alice's project in custom asset
// 9. Eva donates to Alice's project in base asset
// 10. Alice triggers pool distribution

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 5 donations before rules are set', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.asset({ myasset: {} })
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 1e6 })
			.with.wallet({ bob: 100e9 + 1e6 })
			.with.wallet({ eva: 10e9 + 1e6 })
			.with.wallet({ charlie: { base: 1e6, myasset: 10e9 } })
			.run()
	})

	it('5.0.1 Publish alice attestation profile', async () => {
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

	it('5.1.1 Bob donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + 1000,
			data: {
				donate: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject_pool_base']).to.be.equal(10e9)
		expect(vars['alice/myproject_total_received_base']).to.be.equal(10e9)
	}).timeout(60000)

	it('5.2.1 Charlie donates to Alice\'s project in custom asset', async () => {
		const { unit, error } = await this.network.wallet.charlie.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 1e4
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

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(1e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject_total_received_${this.network.asset.myasset}`]).to.be.equal(1e9)
	}).timeout(60000)

	it('5.3.1 Alice fails to trigger pool distribution', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Rules for repo alice/myproject are not set yet')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject_pool_base']).to.be.equal(10e9 + 9e3)
		expect(vars['alice/myproject_total_received_base']).to.be.equal(10e9 + 9e3)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject_total_received_${this.network.asset.myasset}`]).to.be.equal(1e9)
	}).timeout(60000)

	it('5.4.1 Alice sets up rules for the project', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				owner: 'alice',
				project: 'myproject',
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
		expect(vars['alice/myproject_owner']).to.be.equal(await this.network.wallet.alice.getAddress())
		expect(vars['alice/myproject_rules']).to.be.deep.equal({
			'repo/1': 25
		})

		expect(vars['alice/myproject_pool_base']).to.be.equal(10e9 + 9e3)
		expect(vars['alice/myproject_total_received_base']).to.be.equal(10e9 + 9e3)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject_total_received_${this.network.asset.myasset}`]).to.be.equal(1e9)
	}).timeout(60000)

	it('5.5.1 Eva donates to Alice\'s project in base asset', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e9 + 1000,
			data: {
				donate: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(1e9)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject_pool_base']).to.be.equal(11e9 + 9e3)
		expect(vars['alice/myproject_total_received_base']).to.be.equal(11e9 + 9e3)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject_total_received_${this.network.asset.myasset}`]).to.be.equal(1e9)
	}).timeout(60000)

	it('5.6.1 Alice triggers pool distribution(base)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()

		expect(balanceAfterDistribute.base.pending).to.be.equal(8250006750)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/myproject in asset base done')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(8250006750)
		expect(vars['alice/myproject_pool_base']).to.be.equal(0)
		expect(vars['alice/myproject_total_received_base']).to.be.equal(11e9 + 9e3)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject_total_received_${this.network.asset.myasset}`]).to.be.equal(1e9)

		expect(vars['repo/1_pool_base']).to.be.equal(2750002250)
		expect(vars['alice/myproject_to_repo/1_base']).to.be.equal(2750002250)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(8250975342)
	}).timeout(60000)

	it('5.6.2 Alice triggers pool distribution(myasset)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/myproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()

		expect(balanceAfterDistribute[this.network.asset.myasset].pending).to.be.equal(750000000)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/myproject in asset ${this.network.asset.myasset} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars['alice/myproject_pool_base']).to.be.equal(0)
		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(8250006750)
		expect(vars['alice/myproject_total_received_base']).to.be.equal(11e9 + 9e3)
		expect(vars['repo/1_pool_base']).to.be.equal(2750002250)
		expect(vars['alice/myproject_to_repo/1_base']).to.be.equal(2750002250)

		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`paid_to_${aliceAddress}_${this.network.asset.myasset}`]).to.be.equal(750000000)
		expect(vars[`alice/myproject_total_received_${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`repo/1_pool_${this.network.asset.myasset}`]).to.be.equal(250000000)
		expect(vars[`alice/myproject_to_repo/1_${this.network.asset.myasset}`]).to.be.equal(250000000)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset].stable).to.be.equal(750000000)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
