// Test Case 9 many assets
// 0. Set up attestations for alice
// 1. Set up rules for alice
// 2. Donate to aliceproject in different assets
// 3. Distribute assets
// 4. Check alice balance

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, BOUNCE_FEE, DEFAULT_EXPENDABLE } = require('./constants')
const { calculateCommission } = require('./utils')

describe('Obyte Cascading Donations Bot Test Case 9 many assets', function () {
	this.timeout(240000)

	before(async () => {
		this.network = await Network.create()
			.with.asset({ myasset1: {} })
			.with.asset({ myasset2: {} })
			.with.asset({ myasset3: {} })
			.with.asset({ myasset4: {} })
			.with.asset({ myasset5: {} })
			.with.asset({ myasset6: {} })
			.with.asset({ myasset7: {} })
			.with.asset({ myasset8: {} })
			.with.asset({ myasset9: {} })
			.with.asset({ myasset10: {} })
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: DEFAULT_EXPENDABLE })
			.with.wallet({
				charlie: {
					base: DEFAULT_EXPENDABLE,
					myasset1: 100e9,
					myasset2: 100e9,
					myasset3: 100e9,
					myasset4: 100e9,
					myasset5: 100e9,
					myasset6: 100e9,
					myasset7: 100e9,
					myasset8: 100e9,
					myasset9: 100e9,
					myasset10: 100e9
				}
			})
			.run()

		this.expenses = {
			alice: 0,
			bob: 0
		}
	})

	it('9.0.1 Publish alice attestation profile', async () => {
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

	it('9.1.1 Set up rules for aliceproject', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject',
				rules: {
					'bob/bobproject': 5,
					'eva/evaproject': 10,
					'charlie/charlieproject': 15
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

	it('9.2.1 Charlie donates to aliceproject in myasset1', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset1,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset1}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset1}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset1}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.2.2 Charlie donates to aliceproject in myasset2', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset2,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset2}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset2}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset2}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.2.3 Charlie donates to aliceproject in myasset3', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset3,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset3}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset3}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset3}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.2.4 Charlie donates to aliceproject in myasset4', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset4,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset4}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset4}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset4}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.2.5 Charlie donates to aliceproject in myasset5', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset5,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset5}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset5}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset5}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.2.6 Charlie donates to aliceproject in myasset6', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset6,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset6}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset6}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset6}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.2.7 Charlie donates to aliceproject in myasset7', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset7,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset7}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset7}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset7}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.2.8 Charlie donates to aliceproject in myasset8', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset8,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset8}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset8}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset8}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.2.9 Charlie donates to aliceproject in myasset9', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset9,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset9}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset9}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset9}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.2.10 Charlie donates to aliceproject in myasset10', async () => {
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
					amount: 100e9
				}
			],
			asset: this.network.asset.myasset10,
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
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset10}`]).to.be.equal(100e9)

		const { vars } = await this.network.wallet.charlie.readAAStateVars(this.network.agent.cascadingDonations)

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset10}`]).to.be.equal(100e9)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset10}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('9.3.1 Trigger distribution for aliceproject(myasset1)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset1
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset1].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset1} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset1}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset1}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset1}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset1}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset1}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset1}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset1}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset1}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset1}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset1}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset1}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset1].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset1].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.3.2 Trigger distribution for aliceproject(myasset2)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset2
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset2].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset2} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset2}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset2}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset2}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset2}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset2}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset2}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset2}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset2}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset2}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset2}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset2}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset2}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset2}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset2].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset2].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.3.3 Trigger distribution for aliceproject(myasset3)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset3
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset3].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset3} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset3}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset3}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset3}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset3}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset3}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset3}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset3}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset3}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset3}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset3}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset3}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset3}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset2}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset3}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset3].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset3].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.3.4 Trigger distribution for aliceproject(myasset4)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset4
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset4].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset4} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset4}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset4}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset4}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset4}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset4}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset4}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset4}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset4}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset4}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset4}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset4}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset4}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset2}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset3}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset4}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset4].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset4].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.3.5 Trigger distribution for aliceproject(myasset5)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset5
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset5].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset5} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset5}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset5}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset5}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset5}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset5}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset5}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset5}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset5}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset5}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset5}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset5}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset5}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset2}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset3}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset4}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset5}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset5].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset5].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.3.6 Trigger distribution for aliceproject(myasset6)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset6
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset6].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset6} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset6}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset6}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset6}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset6}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset6}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset6}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset6}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset6}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset6}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset6}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset6}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset6}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset2}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset3}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset4}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset5}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset6}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset6].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset6].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.3.7 Trigger distribution for aliceproject(myasset7)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset7
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset7].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset7} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset7}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset7}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset7}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset7}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset7}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset7}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset7}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset7}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset7}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset7}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset7}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset7}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset2}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset3}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset4}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset5}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset6}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset7}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset7].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset7].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.3.8 Trigger distribution for aliceproject(myasset8)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset8
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset8].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset8} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset8}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset8}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset8}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset8}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset8}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset8}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset8}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset8}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset8}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset8}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset8}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset8}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset2}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset3}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset4}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset5}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset6}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset7}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset8}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset8].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset8].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.3.9 Trigger distribution for aliceproject(myasset9)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset9
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset9].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset9} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset9}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset9}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset9}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset9}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset9}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset9}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset9}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset9}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset9}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset9}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset9}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset9}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset2}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset3}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset4}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset5}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset6}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset7}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset8}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset9}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset9].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset9].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.3.10 Trigger distribution for aliceproject(myasset10)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset10
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute[this.network.asset.myasset10].pending).to.be.equal(70e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset10} done`)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset10}`]).to.be.equal(70e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset10}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset10}`]).to.be.equal(100e9)

		expect(vars[`bob/bobproject*pool*${this.network.asset.myasset10}`]).to.be.equal(5e9)
		expect(vars[`bob/bobproject*total_received*${this.network.asset.myasset10}`]).to.be.equal(5e9)
		expect(vars[`alice/aliceproject*to*bob/bobproject*${this.network.asset.myasset10}`]).to.be.equal(5e9)

		expect(vars[`eva/evaproject*pool*${this.network.asset.myasset10}`]).to.be.equal(10e9)
		expect(vars[`eva/evaproject*total_received*${this.network.asset.myasset10}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*to*eva/evaproject*${this.network.asset.myasset10}`]).to.be.equal(10e9)

		expect(vars[`charlie/charlieproject*pool*${this.network.asset.myasset10}`]).to.be.equal(15e9)
		expect(vars[`charlie/charlieproject*total_received*${this.network.asset.myasset10}`]).to.be.equal(15e9)
		expect(vars[`alice/aliceproject*to*charlie/charlieproject*${this.network.asset.myasset10}`]).to.be.equal(15e9)

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset1}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset2}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset3}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset4}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset5}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset6}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset7}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset8}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset9}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset10}`]).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable[this.network.asset.myasset10].pending).to.be.equal(0)
		expect(balanceAfterResponseStable[this.network.asset.myasset10].stable).to.be.equal(70e9)
	}).timeout(60000)

	it('9.4.1 Check alice balance', async () => {
		const balance = await this.network.wallet.alice.getBalance()
		expect(Object.keys(balance).map(key => ({ [key]: balance[key].stable }))).to.be.deep.equalInAnyOrder([
			{ base: DEFAULT_EXPENDABLE - this.expenses.alice },
			{ [this.network.asset.myasset1]: 70e9 },
			{ [this.network.asset.myasset2]: 70e9 },
			{ [this.network.asset.myasset3]: 70e9 },
			{ [this.network.asset.myasset4]: 70e9 },
			{ [this.network.asset.myasset5]: 70e9 },
			{ [this.network.asset.myasset6]: 70e9 },
			{ [this.network.asset.myasset7]: 70e9 },
			{ [this.network.asset.myasset8]: 70e9 },
			{ [this.network.asset.myasset9]: 70e9 },
			{ [this.network.asset.myasset10]: 70e9 }
		])
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
