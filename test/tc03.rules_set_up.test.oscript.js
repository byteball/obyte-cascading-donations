// Test Case 3 Rules set up
// 1. Alice fails to set rules with 20 different repos
// 2. Alice fails to set rules with 11 different repos
// 3. Alice succeeds to set rules with 10 different repos
// 4. Alice succeeds to reset rules with 5 different repos
// 5. Alice succeeds to reset rules with 1 repo
// 6. Alice succeeds to reset rules with empty set
// 7. Alice fails to set rules that exceeds 100%
// 8. Alice succeeds to set rules that equals 100%
// 9. Alice succeeds to set rules that equals 50%
// 10. Alice fails to set rules with own repo
// 11. Alice fails to set rules with not a number in key
// 12. Alice fails to set rules with wrong repo name
// 13. Alice succeeds to set rules with float key
// 14. Alice fails to set not an object rules

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, BOUNCE_FEE } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 3 Rules set up', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.agent({ attestation_aa: path.join(__dirname, '../node_modules/github-attestation/github.aa') })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 100e9 })
			.run()
	})

	it('3.0.1 Publish alice attestation profile', async () => {
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

	it('3.1.1 Alice fails to set rules with 20 different repos', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 2,
					'repo/2': 2,
					'repo/3': 2,
					'repo/4': 2,
					'repo/5': 2,
					'repo/6': 2,
					'repo/7': 2,
					'repo/8': 2,
					'repo/9': 2,
					'repo/10': 2,
					'repo/11': 2,
					'repo/12': 2,
					'repo/13': 2,
					'repo/14': 2,
					'repo/15': 2,
					'repo/16': 2,
					'repo/17': 2,
					'repo/18': 2,
					'repo/19': 2,
					'repo/20': 2
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Maximum number of recipient repositories is 10')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.undefined
	}).timeout(60000)

	it('3.2.1 Alice fails to set rules with 11 different repos', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/mypro.ject',
				rules: {
					'repo/1': 2,
					'repo/2': 2,
					'repo/3': 2,
					'repo/4': 2,
					'repo/5': 2,
					'repo/6': 2,
					'repo/7': 2,
					'repo/8': 2,
					'repo/9': 2,
					'repo/10': 2,
					'repo/11': 2
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Maximum number of recipient repositories is 10')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.undefined
	}).timeout(60000)

	it('3.2.2 Alice fails to set rules with an illegal character in her own repo name', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/mypr oject',
				rules: {
					'repo/1': 2,
					'repo/2': 2,
					'repo/3': 2,
					'repo/4': 2,
					'repo/5': 2,
					'repo/6': 2,
					'repo/7': 2,
					'repo/8': 2,
					'repo/9': 2,
					'repo/10': 2,
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('bad symbols in repo')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/mypr oject*rules']).to.be.undefined
	}).timeout(60000)

	it('3.2.3 Alice fails to set rules with an illegal character in a forwarded repo name', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 2,
					'repo/2': 2,
					'repo/3': 2,
					'repo/4': 2,
					'rep o/5': 2,
					'repo/6': 2,
					'repo/7': 2,
					'repo/8': 2,
					'repo/9': 2,
					'repo/10': 2,
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('bad symbols in repo')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.undefined
	}).timeout(60000)

	it('3.2.4 Alice fails to set rules with a negative share', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 2,
					'repo/2': 2,
					'repo/3': 2,
					'repo/4': 2,
					'repo/5': -2,
					'repo/6': 2,
					'repo/7': 2,
					'repo/8': 2,
					'repo/9': 2,
					'repo/10': 2,
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('percentage must be between 0 and 100')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.undefined
	}).timeout(60000)

	it('3.3.1 Alice succeeds to set rules with 10 different repos', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 2,
					'repo/2': 2,
					'repo/3': 2,
					'repo/4': 2,
					'repo/5': 2,
					'repo/6': 2,
					'repo/7': 2,
					'repo/8': 2,
					'repo/9': 2,
					'repo/10': 2
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
		expect(vars['alice/myproject*rules']).to.be.deep.equal({
			'repo/1': 2,
			'repo/2': 2,
			'repo/3': 2,
			'repo/4': 2,
			'repo/5': 2,
			'repo/6': 2,
			'repo/7': 2,
			'repo/8': 2,
			'repo/9': 2,
			'repo/10': 2
		})
	}).timeout(60000)

	it('3.4.1 Alice succeeds to reset rules with 5 different repos', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 2,
					'repo/2': 2,
					'repo/3': 2,
					'repo/4': 2,
					'repo/5': 2
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
		expect(vars['alice/myproject*rules']).to.be.deep.equal({
			'repo/1': 2,
			'repo/2': 2,
			'repo/3': 2,
			'repo/4': 2,
			'repo/5': 2
		})
	}).timeout(60000)

	it('3.5.1 Alice succeeds to reset rules with 1 repo', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 2
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
		expect(vars['alice/myproject*rules']).to.be.deep.equal({
			'repo/1': 2
		})
	}).timeout(60000)

	it('3.6.1 Alice succeeds to reset rules with empty set', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
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
		expect(vars['alice/myproject*rules']).to.be.deep.equal({})
	}).timeout(60000)

	it('3.7.1 Alice fails to set rules that exceeds 100%', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 25,
					'repo/2': 25,
					'repo/3': 25,
					'repo/4': 25,
					'repo/5': 25
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Sum of rules distribution is more than 100')

		// rules are same from previous set up
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.deep.equal({})
	}).timeout(60000)

	it('3.8.1 Alice succeeds to set rules that equals 100%', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/my.project',
				rules: {
					'repo/1': 25,
					'repo/2': 25,
					'repo/3': 25,
					'repo/4': 25
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/my.project are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/my.project*rules']).to.be.deep.equal({
			'repo/1': 25,
			'repo/2': 25,
			'repo/3': 25,
			'repo/4': 25
		})
	}).timeout(60000)

	it('3.9.1 Alice succeeds to set rules that equals 50%', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 25,
					'repo/2': 25
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
		expect(vars['alice/myproject*rules']).to.be.deep.equal({
			'repo/1': 25,
			'repo/2': 25
		})
	}).timeout(60000)

	it('3.10.1 Alice fails to set rules with own repo', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 25,
					'alice/myproject': 25,
					'repo/2': 25
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Invalid repo: alice/myproject Don\'t set own repo in rules; You will receive the unshared remainder')

		// rules are same from previous set up
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.deep.equal({
			'repo/1': 25,
			'repo/2': 25
		})
	}).timeout(60000)

	it('3.11.1 Alice fails to set rules with not a number in key(number in string)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': '123'
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Not a number 123 in repo repo/1')
	}).timeout(60000)

	it('3.11.2 Alice fails to set rules with not a number in key(string)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 'asd'
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Not a number asd in repo repo/1')
	}).timeout(60000)

	it('3.11.3 Alice fails to set rules with not a number in key(boolean)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': true
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Not a number true in repo repo/1')
	}).timeout(60000)

	it('3.11.4 Alice fails to set rules with not a number in key(object)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': { a: 123 }
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Not a number true in repo repo/1')
	}).timeout(60000)

	it('3.11.5 Alice fails to set rules with not a number in key(array)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': [1, 2, 3]
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Not a number true in repo repo/1')
	}).timeout(60000)

	it('3.12.1 Alice fails to set rules with wrong repo name(without slash)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					wrongname: 5
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Invalid repo: wrongname')
	}).timeout(60000)

	it('3.12.2 Alice fails to set rules with wrong repo name(two slash)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'wrong/repo/name': 5
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Invalid repo: wrong/repo/name')
	}).timeout(60000)

	it('3.12.3 Alice fails to set rules with wrong repo name(slash in start)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'/wrongname': 5
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Invalid repo: /wrongname')
	}).timeout(60000)

	it('3.12.4 Alice fails to set rules with wrong repo name(slash in the end)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'wrongname/': 5
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Invalid repo: wrongname/')
	}).timeout(60000)

	it('3.13.1 Alice succeeds to set rules with float key', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: {
					'repo/1': 20.5,
					'repo/2': 20.123,
					'repo/3': 20.12345
				}
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/myproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.deep.equal({
			'repo/1': 20.5,
			'repo/2': 20.123,
			'repo/3': 20.12345
		})
	}).timeout(120000)

	it('3.14.1 Alice fails to set not an object rules(number)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: 123
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('rules is not an object')
	}).timeout(60000)

	it('3.14.2 Alice fails to set not an object rules(string)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: 'asd'
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('rules is not an object')
	}).timeout(60000)

	it('3.14.3 Alice fails to set not an object rules(boolean)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: true
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('rules is not an object')
	}).timeout(60000)

	it('3.14.4 Alice fails to set not an object rules(array)', async () => {
		const { unit } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject',
				rules: [1, 2, 3]
			}
		})

		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('rules is not an object')
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
