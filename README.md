# Obyte Cascading Donations Bot

Allow github repos to receive donations and forward them (or part thereof) down to other repos they depend upon and want to support.

## Methods

### Set rules

Set donation distribution rules on repo

```javascript
trigger.data.set_rules - set this to 1
trigger.data.repo - repository to set rules on. First part ot the repo(the owner) must be the attested github user for trigger.address
trigger.data.rules - object with distribution rules. Omit this param to receive 100% of donations

{
	'owner1/repo1' : 10,
	'owner2/repo2' : 20,
	...
}

Maximum number of nested repos is 10. Remainder of undistributed funds will be send to the owner.
```

### Donate

Send donation to repository. Donation can be in any asset.

```javascript
trigger.data.donate - set this to 1
trigger.data.repo - repository to send donation to. Example: `owner/repo`
```

### Distribute

Distribute undistributed pool of a repository. If `trigger.address` is the attested owner of the repo, the owner will receive his payment. Otherwise, it will be stored in unclaimed pool.

```javascript
trigger.data.distribute - set this to 1
trigger.data.repo - repository to trigger pool distribution on
trigger.data.asset - specifies asset to distribute. Default is `base`
trigger.data.to - optional address. The attested owner can specify the addres that will receive payment instead of him.
```

### Set nickname

Associate donor nickname with trigger.address. Previous nickname(if present) will be freed.

```javascript
trigger.data.nickname - nickname string
```

## State Vars

```javascript
var[${repo}*rules] - distribution rules of repo
var[${repo}*pool*${asset}] - repo's undistributed pool in asset
var[${repo}*total_received*${asset}] - total received by repo in asset
var[${repo1}*to*${repo2}*${asset}] - total forwarded from repo1 to repo2 in asset
var[paid_to*${address}*${asset}] - total paid to repo owner
var[${repo}*unclaimed*${asset}] - unclaimed funds of attested owner
var[nickname*${address}] - donor ranking nickname
var[nickname_owner*${nickname}] - nickanme's owner address
```
