// Test Case 2 Distribute custom asset without rules
// 1. Alice sets up project with empty rules
// 2. Bob donates to Alice's project in custom asset
// 3. Alice(the owner of the repo) calls pool distribution
// 4. Bob donates to Alice's project in custom asset
// 5. Bob(not the owner of the repo) calls pool distribution
// 6. Alice claims unclaimed pool

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 2 Distribute custom asset without rules', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.asset({ myasset: {} })
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 100e9 })
			.with.wallet({ bob: { base: 100e9, myasset: 1e9 } })
			.run()
	})

	it('2.0.1 Publish alice attestation profile', async () => {
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

	it('2.1.1 Alice sets up project with empty rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/myproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject_rules']).to.be.deep.equal({})
	}).timeout(60000)

	it('2.2.1 Bob donates to Alice in myasset', async () => {
		const { unit, error } = await this.network.wallet.bob.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 1e4
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 5e8
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
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(5e8)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(5e8)
		expect(vars[`alice/myproject_total_received_${this.network.asset.myasset}`]).to.be.equal(5e8)

		const bobBalance = await this.network.wallet.bob.getBalance()
		expect(bobBalance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(bobBalance[this.network.asset.myasset].stable).to.be.equal(5e8)
	}).timeout(60000)

	it('2.3.1 Alice triggers distribution', async () => {
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

		expect(balanceAfterDistribute[this.network.asset.myasset].pending).to.be.equal(5e8)

		const { response } = await this.network.getAaResponseToUnit(unit)
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/myproject in asset ${this.network.asset.myasset} done`)
		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e8)
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`paid_to_${aliceAddress}_${this.network.asset.myasset}`]).to.be.equal(5e8)
		expect(vars[`alice/myproject_unclaimed_${this.network.asset.myasset}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset].stable).to.be.equal(5e8)
	}).timeout(60000)

	it('2.4.1 Bob donates to Alice in myasset', async () => {
		const { unit, error } = await this.network.wallet.bob.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 1e4
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 5e8
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
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(5e8)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(5e8)
		expect(vars[`alice/myproject_total_received_${this.network.asset.myasset}`]).to.be.equal(1e9)

		const bobBalance = await this.network.wallet.bob.getBalance()
		expect(bobBalance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(bobBalance[this.network.asset.myasset].stable).to.be.equal(0)
	}).timeout(60000)

	it('2.5.1 Bob triggers distribution', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
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

		expect(balanceAfterDistribute[this.network.asset.myasset].pending).to.be.equal(0)

		const { response } = await this.network.getAaResponseToUnit(unit)
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/myproject in asset ${this.network.asset.myasset} done`)
		expect(response.response.responseVars.claimer).to.be.undefined
		expect(response.response.responseVars.claimed).to.be.undefined
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`paid_to_${aliceAddress}_${this.network.asset.myasset}`]).to.be.equal(5e8)
		expect(vars[`alice/myproject_unclaimed_${this.network.asset.myasset}`]).to.be.equal(5e8)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset].stable).to.be.equal(5e8)
	}).timeout(60000)

	it('2.6.1 Alice claims unclaimed pool', async () => {
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

		expect(balanceAfterDistribute[this.network.asset.myasset].pending).to.be.equal(5e8)

		const { response } = await this.network.getAaResponseToUnit(unit)
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/myproject in asset ${this.network.asset.myasset} done`)
		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e8)
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/myproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`paid_to_${aliceAddress}_${this.network.asset.myasset}`]).to.be.equal(1e9)
		expect(vars[`alice/myproject_unclaimed_${this.network.asset.myasset}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset].stable).to.be.equal(1e9)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
