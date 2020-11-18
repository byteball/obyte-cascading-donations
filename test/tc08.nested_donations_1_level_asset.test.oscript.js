// Test Case 8 Nested donations 1 level(custom asset)
// 0. Set up attestations for alice, bob, eva
// 1. Set up rules for alice (45% to bobproject, 25% to evaproject)
// 2. Set up empty rules for bob
// 3. Charlie donates to alice
// 4. Trigger distribution for alice/aliceproject
// 5. Trigger distribution for bob/bobproject
// 6. Eva sets up empty rules for evaproject
// 7. Trigger distribution for eva/evaproject

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 8 Nested donations 1 level(custom asset)', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.asset({ myasset: {} })
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 1e6 })
			.with.wallet({ bob: 1e6 })
			.with.wallet({ eva: 1e6 })
			.with.wallet({ charlie: { base: 1e6, myasset: 100e9 } })
			.run()
	})

	it('8.0.1 Publish alice attestation profile', async () => {
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

	it('8.0.2 Publish bob attestation profile', async () => {
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

	it('8.0.3 Publish eva attestation profile', async () => {
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

	it('8.1.1 Set up rules for aliceproject', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject',
				rules: {
					'bob/bobproject': 45,
					'eva/evaproject': 25
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/aliceproject are set')
	}).timeout(60000)

	it('8.2.1 Set up rules for bobproject', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				repo: 'bob/bobproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for bob/bobproject are set')
	}).timeout(60000)

	it('8.3.1 Charlie donates to aliceproject in myasset', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset,
			messages: [
				{
					app: 'data',
					payload_location: 'inline',
					payload: {
						donate: 1,
						repo: 'alice/aliceproject'
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject_pool_${this.network.asset.myasset}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject_total_received_${this.network.asset.myasset}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('8.4.1 Trigger distribution for aliceproject(myasset)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset].pending).to.be.equal(30e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to_${aliceAddress}_${this.network.asset.myasset}`]).to.be.equal(30e9)
		expect(vars[`alice/aliceproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject_total_received_${this.network.asset.myasset}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject_pool_${this.network.asset.myasset}`]).to.be.equal(45e9)
		expect(vars[`bob/bobproject_total_received_${this.network.asset.myasset}`]).to.be.equal(45e9)
		expect(vars[`alice/aliceproject_to_bob/bobproject_${this.network.asset.myasset}`]).to.be.equal(45e9)

		expect(vars[`eva/evaproject_pool_${this.network.asset.myasset}`]).to.be.equal(25e9)
		expect(vars[`eva/evaproject_total_received_${this.network.asset.myasset}`]).to.be.equal(25e9)
		expect(vars[`alice/aliceproject_to_eva/evaproject_${this.network.asset.myasset}`]).to.be.equal(25e9)

		expect(vars[`alice/aliceproject_unclaimed_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`bob/bobproject_unclaimed_${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`eva/evaproject_unclaimed_${this.network.asset.myasset}`]).to.be.undefined

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset].stable).to.be.equal(30e9)
	}).timeout(60000)

	it('8.5.1 Trigger distribution for bobproject(myasset)', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'bob/bobproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const balanceAfterDistribute = await this.network.wallet.bob.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset].pending).to.be.equal(45e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo bob/bobproject in asset ${this.network.asset.myasset} done`)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)

		const bobAddress = await this.network.wallet.bob.getAddress()
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to_${aliceAddress}_${this.network.asset.myasset}`]).to.be.equal(30e9)
		expect(vars[`paid_to_${bobAddress}_${this.network.asset.myasset}`]).to.be.equal(45e9)

		expect(vars[`alice/aliceproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject_total_received_${this.network.asset.myasset}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`bob/bobproject_total_received_${this.network.asset.myasset}`]).to.be.equal(45e9)
		expect(vars[`alice/aliceproject_to_bob/bobproject_${this.network.asset.myasset}`]).to.be.equal(45e9)

		expect(vars[`eva/evaproject_pool_${this.network.asset.myasset}`]).to.be.equal(25e9)
		expect(vars[`eva/evaproject_total_received_${this.network.asset.myasset}`]).to.be.equal(25e9)
		expect(vars[`alice/aliceproject_to_eva/evaproject_${this.network.asset.myasset}`]).to.be.equal(25e9)

		expect(vars[`alice/aliceproject_unclaimed_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`bob/bobproject_unclaimed_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`eva/evaproject_unclaimed_${this.network.asset.myasset}`]).to.be.undefined

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.bob.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset].stable).to.be.equal(45e9)
	}).timeout(60000)

	it('8.6.1 Set up rules for evaproject', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				repo: 'eva/evaproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for eva/evaproject are set')
	}).timeout(60000)

	it('8.7.1 Trigger distribution for evaproject(myasset)', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'eva/evaproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const balanceAfterDistribute = await this.network.wallet.eva.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset].pending).to.be.equal(25e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo eva/evaproject in asset ${this.network.asset.myasset} done`)

		const { vars } = await this.network.wallet.eva.readAAStateVars(this.network.agent.cascadingDonations)

		const bobAddress = await this.network.wallet.bob.getAddress()
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(vars[`paid_to_${aliceAddress}_${this.network.asset.myasset}`]).to.be.equal(30e9)
		expect(vars[`paid_to_${bobAddress}_${this.network.asset.myasset}`]).to.be.equal(45e9)
		expect(vars[`paid_to_${evaAddress}_${this.network.asset.myasset}`]).to.be.equal(25e9)

		expect(vars[`alice/aliceproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject_total_received_${this.network.asset.myasset}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`bob/bobproject_total_received_${this.network.asset.myasset}`]).to.be.equal(45e9)
		expect(vars[`alice/aliceproject_to_bob/bobproject_${this.network.asset.myasset}`]).to.be.equal(45e9)

		expect(vars[`eva/evaproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`eva/evaproject_total_received_${this.network.asset.myasset}`]).to.be.equal(25e9)
		expect(vars[`alice/aliceproject_to_eva/evaproject_${this.network.asset.myasset}`]).to.be.equal(25e9)

		expect(vars[`alice/aliceproject_unclaimed_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`bob/bobproject_unclaimed_${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`eva/evaproject_unclaimed_${this.network.asset.myasset}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.eva.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset].stable).to.be.equal(25e9)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
