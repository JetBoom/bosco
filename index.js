const mumble = require('mumble'),
fs = require('fs'),
express = require('express'),
bodyParser = require('body-parser'),
escape = require('escape-html'),
lame = require('lame')

const Owner = 'f5f60b2e294cf9edead1f4d10cc57451f5c5dc68'

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}

var MEMORY = {}

function saveMemory() {
	try {
		fs.writeFileSync('memory.json', JSON.stringify(MEMORY))
	}
	catch (e) {
		console.log('Could not save memory')
	}
}

function loadMemory() {
	try {
		MEMORY = JSON.parse(fs.readFileSync('memory.json'))
	}
	catch (e) {
		console.log('Could not load memory')
	}

	MEMORY = MEMORY || {}
	MEMORY.admins = MEMORY.admins || {}
}

loadMemory()

var CLIENT

var g_OnlineUsers = {}

function connect(url) {
	if (CLIENT)
		return

	console.log('Connecting')

	mumble.connect('mumble://mumble.noxiousnet.com:64738', options, function (error, client) {
		if (error) {
			setTimeout(connect, 5000)
			//throw new Error(error)
			console.log(error)
			return
		}

		console.log('Connected')

		g_OnlineUsers = {}

		client.authenticate('Bosco')
		client.on('initialized', onInit)
		client.on('disconnect', onDisconnect)
		client.on('error', console.error)

		CLIENT = client
	})
}

function userIsAdmin(user) {
	return MEMORY.admins[user.hash] || user.hash === Owner
}

function onInit() {
	console.log('Connection initialized')

	CLIENT.on('user-connect', onUserConnect)
	CLIENT.on('user-disconnect', onUserDisconnect)
	CLIENT.on('message', onMessage)
	CLIENT.on('voice', onVoice)

	const users = CLIENT.users()
	for (var i=0; i < users.length; i++)
		g_OnlineUsers[users[i].id] = users[i]

	// Connection is authenticated and usable.
}

function playSound(file) {
	if (!CLIENT)
		return

	try {
		var decoder = new lame.Decoder()

		var stream
		decoder.on('format', function(format) {
			stream.pipe(CLIENT.inputStream({
				channels: format.channels,
				sampleRate: format.sampleRate,
				gain: 0.25
			}))
		})

		stream = fs.createReadStream(file).pipe(decoder)
	}
	catch (e) {
		console.error(e)
	}
}

function bark() {
	playSound('snd/bark' + (1 + Math.floor(Math.random() * 3)) + '.mp3')
}

function onUserConnect(user) {
	g_OnlineUsers[user.id] = user
}

function onUserDisconnect(user) {
	//console.log(user.id)
	delete g_OnlineUsers[user.id]
}

function onMessage(message, actor) {
	var cmd, match, c

	for (c in commands) {
		cmd = commands[c]

		match = cmd.command.exec(message)
		if (match) {
			var params = match.slice(1)
			params.unshift({message: message, actor: actor})
			cmd.action.apply(null, params)
		}
	}
}

function onDisconnect() {
	CLIENT = null

	g_OnlineUsers = {}

	setTimeout(connect, 5000)
}

var attackTimer
var attackTarget
function attack() {
	const users = CLIENT.users()
	for (var i=0; i < users.length; i++) {
		if (users[i].name === attackTarget) {
			users[i].sendMessage('WOOF <img src="data:image/JPEG;base64,%2F9j%2F4AAQSkZJRgABAQEAYABgAAD%2F2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoM DAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT%2F2wBDAQMEBAUEBQkFBQkUDQsN FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT%2FwAAR CAEOAeADASIAAhEBAxEB%2F8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL%2F8QAtRAA AgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkK FhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWG h4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4%2BTl 5ufo6erx8vP09fb3%2BPn6%2F8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL%2F8QAtREA AgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYk NOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOE hYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk 5ebn6Onq8vP09fb3%2BPn6%2F9oADAMBAAIRAxEAPwDyzwXPOukwcbFJHU16joti6ojnuRxXmPhO Z721to9uFXBr3DRmiMUabQHwO1fkuPcVUaR9DRhaCPRfB6mO0UH09a1ru9eJxwao%2BE4gkQLH t0NbOoC3CnkZx6157%2BA0t7xCmtbIzyM46Ve0rVJLiQFzgdq5aYpvLA4A7UkWrujYU4A9a43U tozpSR6jBMGUcipjchRya4LS%2FEbswDZ%2FOuhW%2FwDMUYPX3qoTUhWsbJvEXGetQT3KscZzWLcX hx19qja7YKDmtFJWYrM1JJx1zj3qvJdcnBrPFyXHOaa0pLe3vXHKoapXLpuMqearebngk0AB lJH5U0qc5xjNKpdIFuB5zTwgJz1pdnTmgq3IFc8dShstuZABmq%2F2Flb8c1ehUgcnApxmXPQU VIppNlRk9h1lCI8ZrYidVTPpWZEwAz61Be3%2FAJaYBIJ960U1TjcVnJ2NS8vZEtXKEcA4riXu TNOSTyT0rekjmm09vn5K9Krab4ed497jJFceYc9Xl5djejaF7lZBtUZPWk80DOOcVqnQpZeB nHoK07TwaxiDOCR15rzoUqsnyxOrnilcx7Zllt%2FnbCn%2BKsv7Hsu2ZGWRM9RW1rem%2BRBIsZ2K nBJ4xXAL4gbTdSX5gY2bBwc5Hrivo6DlheWL2JdNVotx3O9tTtI4%2FKtGLkrWfp8izxpIvKkZ HPrWlGNpUdTX1NN8yv3PFmnF2Z1GikNGMCtrJArI0PhOa2hyM9q9iHwo82W7GhehpQOpzxQW yMUi4GTWqIuOcClIORzikJzj1p7ZIp2EIMH603GW9aBx2xS7wCaQC7SxOTk0mADTlOecUzGS fam9AT6h29fSlOFFAHtTGkWIZYgKO5NJtRWrKV3sPyNuaOoBqhceIdPiwHuUB9jmp7W7hvE8 yCRZEPAIOayVam3ZPUp05rVonJpBzShhxgUjfKea1IFwaaw5yDkU4nIGM0mMU2rj9RAc8UAZ 7Cgccd6COuKlgIz46DrTeM8jn%2BVAHPU0rYA460wG8IT3zQ3rmkLH0%2FOjbk8UXsAbsc4poYPk t19KeSNvvTSmOe%2FtTAN3UHilB4pPLLcmkY7eAaNhWGlSxpCu3B6YpcN1NIzMwPcU9xjCdwFN dd2Rinn5Rjt3ppNAtD8%2BfD%2BnRWUcYKhT7cV3OlX0dttc88d64%2FWwbKIFcgelR6bqTuiqTxXy taPP7x68NdD2bRvE%2BRtVsAVYk153k%2BZs%2FSvOtI1AxHrWmdRw%2BR19a8uopIuNO70Otl1IsB83 XpTBcFs46Dmufj1Av1NX4bkEAZzxXm1Hrc6YwsjfsrvEnLc11VnfYiHzdq4CKfB4PIrYsdT6 KxGRUxqcmonBs6yW5565%2BlIZdy9ax1uuMqfzqxHdduf8ahVr7sXIaST4HJNP87ms8yZ9qkjf 5axlVS0LUTQiuQrDOcHvVrzwxHpWZGQ2CKnWPPPPFaRquUbBydS6GGMj1pTNtPt61WDMMAA0 MGkGADjt9ay9q4j5Lk32ncCOKrbyZDinRadPI3APNadpoMrHLZrJudWzNEoxKomKR%2BlUJVe6 mCjgE9cV1P8AYDuCAD%2BNS2Xhja4Zl4zzWjpzm1EmMoq7Kttpm2CMbs49e9a4j8uEKigHHar6 6aFUKoGRTl0xpGBPTpXpV0kkkYRd3cTTrPeoJHOa1du2MjHHSnW0It4wuORSXE6qpHftWUUq aTe5PNzPQ4LxRbibzkYkDk4rwrxSJYbwbAAoPc%2B9e3%2BLrhg0oJ%2BUDmvC%2FE8gOoeXIMLgkc81 1Yh3aaPVwnmejfDvVvtmnCB2Bkj4xntXc2ce91OMj3r598JapJo2orIhOGYAgnjFfQnh%2B5TU YIZUxhueO1evl9Xm9x9Dhx1HkfOup12mwBIxnir69D2WordAkQGOuDUwIBxivq4bI%2BdYEc4A pNh3indSMCgrlsmrZDFI44x75o646ilzz0yPSlxx6U2IYT2peO2OaGA%2F%2FXT0QdcflU2AYvyj rQcqc8UrJz3qK7uYrS3aSV9qDnPrUzkkNJt6Dbu%2BisbdpZW2oBn614t41%2BJFzBqBjAYRnhRn itHxz44FxNsVisaH5Ys8n3NeVawP7SZ3lLvGTuULwfevnMXiHVfJB6I9nD0lSSc1e5Lq3jxi pdHcFgcfWt74NfE6Qa4mn3TN5UjbQD2NeNeMdYltU226pAinJ3fMw%2FCsPwlq91YaxZ3RcMN2 8OvBJzXBTThJVF0Pb9kqlJxsfojjCgjof503nqTkdKzPCurDXNAsrpekkYP445rUAxzX2FOX PBSPj5RcZOLFIH60gOTwP1pdoI6ZNNzg9PzrUzYrjIpoFO3EDGKQr1zUtjG5APT8aHZcfhRg jpQBuzxz60WATbkUm089qcxwMd6TtTAaIznrkUO3BwKMkmjHOKWltAEyQMetMO7I4p5XP1FJ kj%2FCgBGJx6VEflI60oyDntTscHn64oQxjDPQfgaQr68U4jjrmmlu2Kq5J8A%2BIbhLiDg9h0rF 02YJJgZ%2FGqK3rTRqpbOfSpbXKSbsZHoe9fNyVlqfQU6djq7WZsLzWtBLuArCsZCyrha29Pty 5HFeTVudSikaMZzjArStC7MBjFQ2dkXK4HWuj03SQMbh2ryqiuhOaWhDbWcsjDaM%2BxrftNGk dQ2APatXSNMVkDYBFdHY2AU9AKzjSfLdmMpu5ysWmTFtpBx0rTtdIcr0IrsbfSUYg4q%2FDpSg j5RRHDpu7YnUdrHDrpTDrVuHS2Y%2FdOPau3TRFb%2BCrUGiquDtH4USoR5txKbRxcOhPgYBNaEO gMy8qa7KPT1U8CrK2i7QQBWsaKRDmcjD4a3YJ6Vet%2FDUYGWAJHtXRiJR7Yp5CKOcCkqSTvYO d2MiHR0jHCgVcSwC4BAxUslzGg681TutTAX5SK00ihe89i2VihBzxxVR9UhDYJArMluHuDjd imn7PbrueQEniik7zSRTjZamra3scznBHoa0EkUjrXJ%2Fb7e3y%2FmYz0zVWfxnDCCA9Ko7TvIa V1ZHaPMPwrNupcliW4XmuJm8fr5gGTj2rQPiqG4tMKwLNxipX7yasaRjyoyPEd6pml%2BXfgcY 5rxHxduS9aQKXDN3HTmvRfE%2BuJp08nmyhSBgEnrXGz%2BV4gjZIYmxJ1b39amdX3veR7OHhypM 57T5I2ZMna2fXpXrHw18UDT7qOCaTdCxAUsenvXnFt4C1KFmZWXHXJ64rYt%2FD2pxOoVVjwBh s1pCs6NRTgbV4QrQcWfU1pKk8KMrAqRkYqYgEEj9K8a8NeNL7Ro447hzNGvBGOeK7Sy%2BJunS AGUSRdjnoK%2Bzw%2BZUZxXM7M%2BPq4GrB6ao7HGBSMTxWXZ%2BKNLvANl1HluxODV06jaKATOg9MsK 9KNanNaSOGVKa3RZQDPWn53HrVQalalsCePcO24ZqUXMZO3zFJPTBq1Ug%2BpDhJbolHOfShXY EgY%2FCmK4IJDVU1LU4dMtnnlcIijJNNzik22Ci3pYnvL2HT4XluHCRgZJJryzxf4482OWVpRH brny0H8zXP8AjL4hya5eMkZYWkQ%2B6ePzrxjxD4pv9W12O0Rj9mU5fB%2FIV85icY60nGnse5hs IoK8tzpb3VTqt0Z5yeQSrAnBqCfVhEuwxszYzvcgGqV5eiytgsQ3Y4wQNoPqK4vVdWkjfdJO hXq288n2rClT5tjqcLs19eMN05lkCHGSCcZ%2FOuJuJZop2ljUfK2Mg9B7CtNNVjvBuXAj6Eg5 GfarF5puIEmVVjAHQ9TVzp%2BzR30JfZZ9Z%2Fs6a6dX8BwxvIXkgYrg8YGK9TByOmK%2Bf%2F2WLuVr O%2FtnXaowwr6DeMYr2cFJypJny%2BOjyVmM560hP1pVyuc9KPvdK9BuxwaCMM9DSFuPU07btOaa cck0XuMQNzntQXxjFHBTP4UijIxxQApPH1qMk59qfnBIxz2oHTkfSgBjZIzmjOWyaViAcjpT ScnP60gE3c9eKCODinA456fhSOcdqYEYXr1pCQNtOXPvTWXmgAJDNjFNfA6U7aWHvTHUg444 qrkn5oWMDNhV%2FKuq0%2FQJZUU7eT6139r8IbyylVvsynHcV0Vv4NubeLm2OR6DNfJ1ZTe0WfQ%2B 0itmcVo%2FhxgBkEn3rqLDw%2BsfOOAfStm10O7iYHyGA9lrbtNNYAb1Zf8AgNeXJTbegnK5jW%2Bm pEuQuTWpYafLO4wuB3rSjtAX27c%2FhXRaXZIgHy8d65eRyZV1Yl0bQ8RgEc10VrogRgSPrS2K LGuSea0FuhH%2FABVbViGyxBYqiDpVlIljxnB%2FCs46iqj7w%2FOoH1qJD98e%2FNLZE7m8SgGacJgB 7Vy83iiCL%2FloPzqlL4zgXPzgD61F1cfKztWuVxjPIqGXUEUffrzi%2B%2BIMERYecB9DXPah8S4w Ttlz9DUuolsUqbaPW5ddjTqwrOu%2FFUKKcuAfrXid58Sd2dshz9axZ%2FHs02QrE%2FSiLqSVlE19 kke1XXjFOcOPzrFu%2FHCAn94BjvXjkviS6uDld2PrVf7TdT5LSEA9hQsNVluzT3YnqN98SFgD BDz9a5%2B4%2BJFxLNuJLL3ArjxZszfM24%2FpU0dkARxkeldVPDKFm9yLpnSXvjea6RQjMBWaNZun yTn8TVeO0GBx0q5DaAkDb%2BlbypRlq0RF8r0Eju5359a6PwzLN9oEjHci9QTVTT9GkvXRVjI5 xXa6V4XFooeYfMPTvWTSj8KN4xctzj9c8KT%2BJLsOcpDnBYntW%2FpnhyPTbaKGIfIvUt1NdYts sYIVBsHfHNUryKRRuz%2B7J4GOtYxw8mryOx17KxmXMcaR7VPA64FZ0sqo%2BCcDGATVy7lJBG8K vcVzd5eLG%2BWUjHXnNc9WnbYqnPm0ZoSzx7BhwT3Wq65lTKkeuTWG14Z3Lqc49eBircN35oAU Entg4H5VyM6raXNeztCrByzfUGrU8TyEYdgcddxPFULaZpSNxIIPOK0t8YRQpIDdfXHet4Kb W5jJxT2M1xJHIdruW%2FvKTmpbfVr22nEa3LoB3LnitRRATwMkLyDxisXUTHudtuFxwa0vUhqp MPcl0Jbv4g3GmTLHPqEoUnhs8VU1f4gS30Aie5aVG5Rc8VzXi7RJtZsNsUW2WM70zwK4Cfxd HpFqYZI8Xanbl%2FXrXRTnVnpzM0VGm1zJamr4y8XjSI7gliS2AEHc9qy%2FCavDaTXc8Z86c7iM flXGwSX3iLWlEzHZu3jPIr0wWiQ6WsasGlZcAd69JxVKKXVmE0upyfiXxRa2zDfLiUHADdAR XKX%2FAI2iKkPcwuhH8IHBp%2Fj7wxPFCXYhsZPzttyD7V4hdTs18VdzgE4EfQ%2Bn1%2BtfQ4LDRnBM 8%2BtVVNqx7Jp%2FiK3upQkW6V88FEwR9favQbS4Bs1%2B07l%2BXvXl%2FwAMLLzMjnC4LEnqfTNep6lA 7xxwiLeMDAziuHMHyvlR1Yb33dntf7LTu13qILhhtGPpX0gxAOD1rwH9mTTjBHqMzRrGxwu0 DoK99X5xyeneu3L%2FAOEjwcwa9uxSwIIxSDAPFI4HGDmlBwOefwr02zy0Mxlvag479KC23gCl AGM1N%2B4xOBijIwc9aR%2BT7UgXIqkwAnPTmkByQMY96djB45prHjH60kA0nn196OAe1O2bVPHN MIBajyAcMEE1GeuM09iRgdqQjpTeoeYxT1FDDHYUrDaDimAgDB5NF7A9xpJDACkPX1pT1BHF NbA60CscGmqabLjBX8amWXT5OMrXwpofxM169u47eG4lMjHjmvYdGm8T3FssjXUmCAa4pVeX RxPoa%2BWyo7yPo4QWLDqKBY2jcAg%2B9eDLf%2BKINv79m57rViPxT4ng6gMR0ytR7Wm370TieHkt me5LpVtnPy59qsR2UadMV4dH8QfEEWA1uG%2FOrUfxS1WL%2FWWZ6dQai2Hl9kXsqi2Z7cIflwP0 qvLaSSDgn8DXkcfximiIMtrIo9RUq%2FHuxiB85mQj1FT7HDPSw40q0nZI9HuNKumBwzD6GsHW NDvobaSQSuGUZ5NQeEvitZ%2BKrwwWkgfbyRiuy12TGnuT1IzWbwOHqRbRMp1aUrS3PmjxF8QN Q0u9kglLHBIBx1rn5PiBf3GcM4z05xXQ%2FEizikuWKr8zMSTXGQ6eCBxn2rxfqtKLtY9elacb lo69qF2STIQtSRtczjLSsfanW9ptxx9RWhFbjP07U%2BSEehq0RQ2hY5JJ4rRt7NQMAf8A16fB Hk9MVfto8Ypehk30GQ2wHUdasLajIwM%2B9WIos4JB54qzFByMDpUHO2QR2wPXirttYNMwVACf Sp7azacqq9zj6V6D4W8HhVWaQ8jkA9TUydi4xu%2FI5iw8FXF2N5XavY10Fp4FEOC%2F3hzjrmu7 kVY0SOIYYelRSoysQSM9eankk92bJxXQyrTT4NPiC%2BWAeuccVIz%2FADEkDA468U2%2BnKcHDd8d qh0uCWeTLjagPBB4IqoxSdjS91c1rezEkXygkHue1VdRsDboGbGzGMHrWol0jp5UQ2445qC8 fzYysnzYGK71Fcp57k%2BY8%2F1bKpJIAFC9Tjqa4fWNS2o4AyuNxOK7DXrgRGVThh%2Fk151vbUb4 x7soSGYAcgV4ld3eh6uHXUs6XYTTRCQt%2B5bnnsK2mWG0jXZt3k7QfQU6L5o1h4VSM8dsVatd OMioYYwzscZPp3qaWGcrMdXE2ehWjvmWdRu7Daq9vrVqS68pmYIzbPXJyew%2FOnxWc0WP3EZ8 w%2FM5Gc%2FhRPBPLGytKEweSgxXoRw7S2OF1ru4kFzPJG32j92mM7icDOaWZGnKsRuVRkEn%2BdU5 YxHExKh1U8sTkD8KmiuTIUUHzUbkEDn8q5KlM6Iz6jmcDlwQnGcdAa88%2BJPw5i8QL9rssx3a 8kjoa9JETkkEOynBH8OadahSZMqhx6jtWC5oy5o7nTGo07nzhYGTRLthMuZFfaMDnPpXaDVR BHvAXzMDkdvpXQ%2BL%2FA4F4dRhjBiYBmA6g%2B1eO%2FFnx0vhDSGitkEupz5WJMHK8dfwr2KF8U1H qRVkl7z2OU%2BM3ju0td9pv%2B03rc%2FZ1bhfeQ%2F0ryXw9DJeXRurxg8hI2qB09ABWRJDdXuqtLdZ kuH%2FAHj56lia9b%2BGngW51KVJyojKsFUsOnv9a%2B1jGnhKPK3rY8JqVapfoenfC3QibNZGUqif M6kY3NXoE1oQrSyKASMcdVFWNB0y20jTxGrCUrjLHuaikmjvtZt4Xk2l3Clc9s%2BlfE42q6tS 0T2cP7u59FfAXQm0%2FwALG5ZSpuH3gseSAK9NIOO%2BfSszwzaxWWi2sEIAjSMAAVqMMtX0uFgo Uoo%2BaxEueq5AsYxyabjrT84HFCY7V1vsco0Z6Y596RgVPPSnEHJPam9fpSGIxpFJx1604hR3 pu7HamgFBwDkikznv1oIBB700Jg9aWzEOZ9vTnNRk5OelOI4FNOCcYzR1AGbPakAJ70%2FIIHQ %2B9Ncc8HinYBGwDjOTTDwfalII5zSEgiiwDXbPHbHQUzPb%2BtOA5PcdaTaWPGKAPzf%2BE%2Fh97zx HH8mQo69a%2BvtI0JLayRSBkADpXyt8PfEC%2BFNQaeYEBh125r0S4%2FaStrWQIIpWX%2B8q1wUpQfv TP0HOMLWnUSp7HtUmmbQQFDc8HFRjR9w%2B4DjrxXlFp%2B0rpbMBLvU4z8y1tWn7Q2hTKM3CL9a 6k6T6Hy8sHiYPY7xtBiJ5iB49Khbw7A4I8oA%2BuKxbT4z6Bdj%2Fj7hYn%2FaFa1r8RtFudoW4j%2F7 6pclJ2uZulXXQpar4PhFqxMQ6ddteGfFPS4tLsJGjyrZ4xxX0jJ4l0%2FUIgiTqc%2B9eHfHIW8l skUTK25scdq56lOMFeJ6eW%2B0lXUJIZ%2ByzaSTXt5OzM3zhQTX0v4mfZYtnpivFv2ZNJW202SQ L9%2BQnPSvY%2FFhJtmXrkdquH8Js5s093EuJ4B42zNegck5Nc5HblD0rrPEtuZdQIx0qhFp7Mfu Edq%2Bfmnzs1pTSgrmbFEO45q3FER0HBrRi0l3wVjP5VowaJO2B5Z5qOSUug5VYrqZkFucjIxW jbWjdxWva%2BHJWH3MVr2vhmU4G38fWrjh5voc0qy7mDHZk4yPpVyCz56celdTbeF2OAVzitW3 8KYAJFdMcJJowdeJj%2BHtF86ZWABUdc16MjLa2qKhAUDH0rO0nTI7TdkEcccVqw6Q92DtQ57E VyOm%2BeyOxSXItStDuldsHJ7kdMU2%2Bby4W2%2Fe781pyaFNYQCXaMH73Y15X8ZPHsPw%2FwDDN7qk jeZLCn7uEE75X7KPer9jOUlBLVlKpFRcr7HWwQfaMyTyqpB4Utx7VHqGofZIU2g%2FM23Kmvzt 8f8Aj%2F41SW95rss15bW6bDLFDhVsxIcxpIezEduTxWz8C%2F2kvFN3fQ6H4qNzNBIx2Xsg%2BXP9 3djGa96GTOnHnkeXLMFJ8qPv2wvhKV8shhtyGzVbU9Ua2DZyMg5z0FYfhfUIxoCXSuWWTlCe eKpatqEl4DEgLZ5x%2BNeNVlGmnE7KcXNpnO6zrAczljtHb3rDs5UgDOrqsrAMcjqPStO%2FsWX5 ZByr4PHWqtvpZ%2B0K%2FkkYOAT3BrwVHmldnr3tGx0WgWLXMmFUHK5dxyMntXYRaaLcLnhxgZxz UPh%2B1%2BxQLleg6ntWtdsjjzQ3AGQK9yhSfLzHk1ai5uUoXFnFKrBR8vTHr%2FhXN6xbyWysihrc MCBg5B%2FPpXT2kjNblol5bkkngVmanGjnbKN2OPpV1anJG9iKUG3a5wtxqSWMYto42Mmf9YuW GfUmrdhfScCVAqBsFgMEVPqmhFUMkTymLHAjA5rJtk3XCjznbbz5bnn6V40pqR6ajZWOjjuA jmMESk4AL96cIPIjODhWPIAzxVOzu1M5ErOAfm2so6VaFwBN%2B6%2BXPGSf6VEV1HexaWLdGfMB aLbjDcfpXm%2FjT4Z6Zql2Lw2iSMM7cpnAr1WCRUVUb5sj6n6mpzbRzoSUV8jAzWc1Km%2Bam7M1 hNbM%2BNrn4MJaeKmv5QHhZiwQLwB24r0bR%2FDUdnbBIf3aEE8die9eweIPBttPCSqhXHRlP868 6u7K5spDEQxAOPl710yzCtUiozeprGjBr3TlvGkHiPStLhg0OMXVzOwj3n%2FlmO7e9afgrwRL 4entLnVL17rUZCC7P2ye1N1%2FX7vTY0NuWB6BgvzD1FRaF4rvbu5gW7IknZxhXwGAB9qbqVHT 2NFRd7rY%2ByfCt%2BZbCGMcsB94n%2BldSG%2BTnAPFeU%2BDtXzBFl8HAyM16Vp9wJox0r6PA1%2FaQSPl sZS5JlvOTz396U4B4yadw31FIOc%2B1etseaNZsAYpcgdqFbPalZemaNQGct2x9KaQCcd6l4Gc UwjdzQtXYZGGwcU7GRwaTGX5%2FCnY24GefamtRDWwQMA5puMHPc1JkhuaRhz04osMZyfSmOCT z2qb7uOP0pr%2FAHue1CYb7EWeCKToOmakKDrnFMI2sPSgQ0im5J%2BWpWxu%2FSkIw1G4bHyXa%2BBN PMYHlDHuOKmT4f6Oz%2FNEmfQgV0kBZIQMAtjvXPay120wSLIJ7iviZ1pKOjPs6derUmk2ZGs%2F C7RnyVjjyT0GBmvPtZ8E2NnfrbxwjLHla9l0zw9cvh7iViPQmqGv%2BHUW4FwEBZenFYwx046M 9SnUlzWk9DyW4%2BF1skQkVXjYjIANRW3w%2B89wkM8sZzghXr0%2B2AvHEZiI7GrK6OlneLImBlul TLMKkYN3OmdeKdrHDab4Q1nSpR9mvpsdg7ZFM1zwhq2pOJbmbeV5HFetWkYkkHAwPWrk1j9o JTAIx1xXlQzevJ2MvrHs3zJJF74DaS2l6HFHIMtyf1ru%2FEI835D1qn4C0%2F7DZgHrir2qkPdK O1fo2Fcp0YuXU%2BIxtb21ZzOVbwfHdOZWTk9c1PD4LgAztB9eK7G2jVYxkZyKnEYXkYrujh6e 7R5jrST0Zy8PhKFBwvFXIPDkSHG0flW6oAFPGSCK09jBLRGbqSfUz4dFjTOF7VcTTY0AwtWV zwDwcVJkpg9QaORIOZjIrUJ%2FADmpcRIhJABHY08EMVxz9KWTYUww61nN8qZcLtjLWyNxIFVc 7vXpiu70nSYrKBdqYOMHPPNYHhzSZA6zFycHIU%2Bldc8mwHpkDtXPg6EXepNG%2BIqv4ImfrLxL BsIB3cZxXzd8S5NMvfHMWnXFp9oaztJdQjDYKeZGCyg%2Bp3YNe3%2BIdUxdBS6qR0BOAa%2BdPi9Y Xy6udasMvIqlMA%2FeyMEH255p0a1L27cvkL2c1TVj4O8Q%2BJfE0ljfSXNxIWluJbx4g%2B5WkYnl h3IHA9KyfBPjTxH4%2FHh7wNDdFdI0%2B5e4ht0QcSNwzk4yeDivQ5fh14mu%2FEN3Y29vbXEVxK0i eWWPl5PIIxyOa9%2B%2FZ%2F8A2V7f4fPN4g1YrNrFyCqps2pEpOeAfpXq4rG0sNSd3d20M6WGnVml bQ9Y8LWc0eg2Fkg2iCFUweowK6K30OGD95K%2BTjdxT7W3jttqw8Be%2FT8KtTpNJAEVCpcYLGvz ht1JOUj6lxVNJI5yfS4r6f8AdjcAcZPai609LEKoySBwWNdLHpy2sK4XGRkn1Ncn4l1UQMck MAcD61T5aa1Is5S0NS1vRDFgNg46H9abf61AsJjZscYOOMV5j4i%2BIEOkW8kss6QgD77H7p9C K%2BdPHf7RWteLdQXwx4aDHULqTyPtCdVJOMj%2FABr3MDTqV42itDzMRy03dnvHxC%2Faf8K%2FD24%2F s579J76PkxISQvrms3wl%2B1P4N8YyiBdVgSdiAsbFo2JPYZ4NcXqfwX%2BF3wb8FW178R7C78Ua nqkyxzSw3fkzx5GWKkg9OTXyN8TvDfgy38W6jJ4B1HUYtKidPskeormc56%2FMvGB2Pevpf7Hp VYWkzy%2Fr04S91H6dwa%2FFPDHIkZkgb%2FlrvHGapanZJPIJllaNcdVGCPpXwX8BfjxrHgnVn0LX 7iW80q5IBeaQs0bcfMCe3tX2r4U1tNSj8uKTzVZQ0eZNwIP8xXxGZZfLB1NNUfQ4PErEQutz oraGQxgrIJEOPvDLCtG0RGZVD7HHJAXPFJaQSTxJHtEcn95R6VoxWrwEEBXbGBt6mvPhF2uz olK%2Bg%2B3iQ7mZzweAowD9auwXas%2Bw8gAcmqkwcFSr7WHVQMVCrGSQbw3lr2PrTbs7WJSNi4eG U%2BXlcnnFcb4o8PpIryJ%2FrB0NdBFIyPlY8BR1PNQ3k4cMW%2BbI6etcleMbcyOmlNp2PBPH8d3p diJo0WVBnzMjlfSuS8F%2BI1n1JRsjzx823kH617f4u0pbi3kcAEspDLjORj0rx2x0GOy1%2FFvC dobPyCt6FSMqTjJHqQ11Po%2FwXqCmKH5jzjn%2Ble1eHp1Fuqqp3epNfP8A4OuCkEQwVA469K9u 8Fyb4xlsk%2F7Wa68qnafKeFmEdGzswcL7%2B1GcAn1oJAOAOlDEHjFfZpdj5cUYxkUjKevakXoa GZlH5UMBGBBoBA60pAZeeKEXNF7MEISAc9qac8egp0i46GmouQRmgA25bikkOOvSnHg%2BhpAM 9ad%2BgAHBXIpCVJP5UhAB9jSZ29R%2BVF7DuNbrTCee1SHHJPFMXDnJwB2ouLYRvu%2BlMBJ68VNI ABTMDrQG581NqZC9APei3YTXKuQMeprDk1eJyEU5J7YrYgKJEh3YJwea%2FO8UpNWifYYe0Xdm rfXbKi7Dz7U0TQ3kH7wD0NCxedH83pWXcWk0JbaSPYd64aaa1Z0znrZGLq2vWWi3nlkAN1Bq vYa3%2Fa12Sn%2BqHSuc%2BINq8UBlKs8vUVX8H6v9ktP3qEtjn6124ilGWH5obnRRjzWbPU9LkUyH djHvV671WO2UhRkngVz2i6zbTruZtp9xXc6D4ft76P7Q%2BH715GCws6s1CK17mOIg5PfQ6Lwp eOLJWYZLDkelWpz514p5GKj0%2BQJdRwRxkIDzxxW%2FqdhFCscgO0nt6V%2Bo4eDhBRfQ%2BZxOGlTT kRooVRj0p%2BCc4pqMNoI59%2FWlVsg816kWnseIxVUlTTwOPSopJFRcscCpEYOoIORT8hInXAxn rTvmK4%2B7USkLg017nacZxUMZMilSWU7j6CpoohdSKgzk8Z9KghkVx1z%2FAI1s%2BH7c%2Fa%2FO6qoy eP8APNc1RXVjaD1Om06BdOs1U8uankl%2BXdjg9famGdZlDRnI9KguNxXH3SeOvFa3UYcqMG7u 7POPHDFb8HaWQ8jHNcx%2FZH25gJMvGwwIycA%2B5r0zXvDnnDLYy33QfX3rKbT4dDtcylXnPcfw 18zUpVFUbPoaVSDppM5Kx8J6doZM0drGkzdSByaJRJeMNqsE4xxWmbtbmXK%2FMDyfamTahbwu N7DcDj5eQfwrnlRnP4jpjWjFWRDFYqkgJUEdcHpVueRYFBRDIQMYqCK6ErfLg49e9TXI4DYy Py%2FKp9nyjdS5nXt0rhi5Ze2D0rhvGtlHc2LsHCBgQHJwFrub7ZJGVJI3Drjoa5PxFBK9ucM0 m0HPOQ1ctVXRtTaPlj4teGNXbQLyS3na6ZFLsF4GMHt34rxH4Czx%2BGPitY6jrABhlVvKlPIE meh9DX3ZH4at9Tikt7yJZLaRCvlkevUV5V4r%2FZM0TUbnztOllsbncGARsoD24%2FrX1OUY2FOm 6c0ePj6UpzTR47%2B1fqupeNde0pYbhBZRo5UsTgvjpn6V8zmDU9L1gyShRlSjbvmGK%2B2td%2BAu rarYW2n6tALyC3YubuCYxOfQMak8Pfsl2GpXpNxYQ2aj%2BKVzOzY719TTxtGnD4jxZUZyloj5 3%2BH%2FAMGLrxxJazSxOs10QlvDjJZM%2FNIe4UV93%2BAPhUPCnh%2FTrGPdI1uuCW6%2FnXReA%2Fh%2Fo%2Fw%2F tgltEsl66Kkk2MtwMAD0HtXbWsIJJzhj0WvlsyxUcZJQjsj1cLTlQXMzn4NGuNxVH4HUevtV pdJaMYKkMBzhua7DTLJ2bPljHfHNSXFhuJzEoIODuIwfevLjg3a50yxKucRLaqZVHmbQBzjk n60z7BIsjOpBJHBHNdRdabBEuWO0Z7dDUIt0kICMFPXnnFZSwd2bLEK1zljE0efNyPVSaZOP NTCgLx19q6mXSljJeUhz%2FtDJ%2FSszUoARnhYwPuqPmNc9XCpRLp1%2FeOQvolmDKV3Acbh3rkLf w%2Bkd5IRt69BXoFxGWjbCPGvbcKw7q1jEqsAwJ4JPGa%2BfnB05WPcp1OaOg7RgIpAvGB2GBXtP gR4vIXavOOoGK8XiQ28o2BQPU9TXqvw7n8xMMfavVyuSVU87HK9Js9IJxg0ow2D6U1B8uc8d qcrdu1fdI%2BVE3daGO4YpGx1yce1AQEkgdqV9QQoBfI9KVflzzTWbBGOtAJPXrQ9AFZy3tSDj OaOAelDrgZ7U7gMB3HvmlI7CggDnOBSMfSlcBSnHPBph9PTvUgf5cN1puAWOabVwGLyTnHpi msoGMdqcwJHHQetIcDrzStcNxjkn3%2BtJtO0GnEBs44pm056%2FhRcD5etNJtoiWdl3Kcg1K1sb iZSrfIp7Gmy6TPOhKkgnrzSW6TaepDnjpXwlRSlT94%2BrXJFJxldkmoeIf7PAiVdzVd0nU%2Ft8 Bd1AGMjNZaW8VzMZHG4Z64q3cSxWlsViGM9hXLypU7mkW5SEGhx%2BIbw%2BYoZQc4PIq%2B3wzsWQ YiUHtt4qXwqrqhY5wT9K61pTFFuJxXoU6cJUveRwVcVKjOyZ57eeABZgmORkGOma7zwBYvDZ iKWTcoGM1l3l%2B9yGG3IHpVbSPEs2myOjRsEHfFdeCp04LntZnOsdVnVSb0PUt1raLlVG4d8V g%2BI9aklhIUn0%2BtYa%2BK4bmZU37Wc9DxWzeRwQ2Ynf0z83avVVb2ifK7HrSj7ePL3H6Xqcslrt ZCCAKu%2F2vHCP3n3scCuL07x9aNqX2VYyPmwNw610dzaR6mUcZGTniuqhVbaaZ5OLy2dGHOyS 91KK6K%2FvRGB2PSr9lqdqIlQTKT3Oa5rxh4TubzRZRaztDIVJVkHSvmLUfEPi7wlrTwXd48mx jjcOCM9a7J1FT1keAr3skfZz3aKhIkRhj%2B9WVc6ogk%2B%2BF%2FGvKfh38UhqsEcNyoWXHOR1r0Sa 5guI9wC4I5BArGOIjWvy9DeMbas6HS7sTEYYHn1ruPDymCFmIyTXlWlta%2FaEjEkaljwua9Di v7fSrFR9vVWPUHLL%2FKk5XLcUdBJL9ll82LBycvF6%2B496NT1qy0fSbvV9QmS1sLaNpZJpTgKo Gc1X0bULfWCCJIpCvUxNmvAv2%2FdY1e0%2BBN3aaMpMcs6i72dfK5J98etduHpus9djlqWic94%2F %2FbW0y5a5h8P6naW8acbnO%2BV%2Fp6V5I%2F7Q93rU4kl8QSMS3CtKACfQjtXwZa65cajeXMTyblUF lZeDwahuNUuIFZxI8Z6nBNe8sJTtZo5%2FaSXws%2FQD%2FhoDW9LQ3Ek8c1n0LNxkema6%2FwAF%2FHTT PFt%2FHFcXH2K4OP3TyfK3Toe9fmZY%2FEXUQ6QG8n8gH5VZtwz7g12nhvxndNdrHJIFkJyuzjn1 4rnq4GlKOiNo15J2Z%2Bt2lT%2BdEsttH564zuUjDcdBW6HZLESTqYyRzGFzivmb9kH4i6z4ttbq 11ZvOjhIW3cY6Y5%2FWvqeO1VlBf5m9zXzVfB%2BzbPRpYjm0Zz13AC6tI6hWHygDt71i3dmAjKN yocnCdK7XUbeCZFKpk%2B1c1c2jrNhQd%2FOExxivBq0mpHq053Rz9tp%2FwC%2BOwZ3EEEc59cinX%2Bn %2BQQzZU4O0o38617a3kjlDP8AKqk57ECtcQ2s22N18xCOMjFFOm7e6Kc03qcB9nmYB5X8tQfv dRj0PrUlvNtysBTJOS1dxd%2BE7e5i4YDdyV6g1Vj8KxWK8L9duabo15u19BKpSirnO2lu6XAY urSY5yOCK6Swi27GYZI6nNVfsFvGwYnaoOQwPQ1fsRJGQ27zU7EDkiuqhhpQfvHPVrKasjet pWWIBFGT36HFOl8zyyw%2B8OcE1BDcKyZVWBz1xxVyPZKFLKVPXmvVsrHn3Zxep3csl4Y5lKIO qj%2BdXrS2t9o2twQON%2BK6OayillyUUn6CqU8MYZkSMEj%2B6uKxcdbl82ljNkdU3BBkdODzVaSA ysSw2r2yK03iCr8qLu9e9UriTcpBAyPeuapHQ6IMyL22XYVzn1LdPwrmdQtB5gVFLYOST2rr rhUlO1j8wH3RWFqZEJJxkdOB0r53GUluezh5taGbFbo6jLbmHGDXX%2BDLw2l0sZyEJ61zmnId pkYAZ5Hqfzq1az7b1Qvy8%2FMc81zYaXspxkjaovaRaZ7dBL5kQYEY9KkwPX8BWN4duBPaJsJI xjp1rZHH1r7ynNSimfLTi4ysAIA9KVeSaawzzjBoDbeBz71ZD7geSOKCDjP8qXBzSsBgAGgC MZI45px7UNgjuKbnaOaBCOwzgc04EYBprAMM9KTAAAo9B20AjnHJppXC%2BlOZduMfrSEk%2BlOw hoyf8aQkHilYfMcccfrTXjwRRuAhOwexoX5uRQwIpqnC470WsB8%2BqLhCd9vIPwrE1%2B4kVM%2BS %2FwBCtew2l7p07BSF59auz6Zo9zFlghPvXx6lGoj6bkalzHhGl3aLES525P8AFxUdxdxS3KAO CM8c17Fd%2BFtJnDBUj577ax5vhvpcpLIqqT0wa4pwT0R0xlbczNGaJIU2sOnNXL2Oa9Bitjkn jJ7U1Ph8bd2MU8gXpjd0roPD2iHTE%2Bd2frktXo0HF6SdjznhIzneRmaX4dmhhJlPJ6jirois YvkmUbs45rbhDySlSPlPeub8T%2BH7mZg0T4Gc969SnGmr8h6OFw1FSsyDUvDlr9oiubdR8rVt yaXFdWwSZvlIwVB4NVtLZLGGNbpgWHcnHPasH4geIzp9tG1qx27sHZ60404xvI6YUf3nLAff eF7HTZTcIgPqe4qjceMorGULG25Rj5RWbeeLi%2Fh1pbjAYxnI%2FCvItN1251G9lPKoT0b0zUuf I7w0R5mY15wXsnqfT3h3xXb63AI8qwPGK434n%2FDWPXojPEqrMuSrVyPga%2FltNcjRJCytwRmv b5Z1mtk3f3eRXowqRxVO0j5iKlF3PnTw38PNT064w4C7W4216xpVgYbcLKc8YIrcuPJiBwqq T7ZzVLcznCrgdMntXLTwyoyumdSdzp%2FBmnK2oIyxqAO%2BBXpWpeU9qqjYSP8AZBrzXwdfRW9y c%2Fv36BfT8a7C8l1S%2FT900VpCRwAvI9TmumL3Ilui7HbjSohcxRRb267V2%2Fyr5t%2Fay8eLpvhx pLyze7sEfF1DGeSp9D%2Bde06jq02nWzQ3M8l1GBgyDt757183fHi7s9c0S5ssG5icMHVW5x0G fU%2BnpXt4OySOKqrs%2FPzxJp3hq21K%2BvtBtruFLlmZVumB8tSc7RiuKv4kuYS3O37px1FeheKt Dk8P3kluqM8Y6KRyPauG00qyTrIpU%2BYcAjH4V7cZX2OZqxzE%2Fhq%2Ftz51qhuIR8xKYJH1HWtn QLrUb%2FUIYobXE%2FC5Hb3xWnZ6Jf3V0F0%2FejOccHAx717J8LPhyYb%2BFJpR9qOMsE3bc%2F3vY%2BtX KStqTZ3PpP8AZE0qTSdFivJFYjBjYo3Q59Pxr65tLxjGAdyg%2B4NeA%2FDHSk0DTZbeKNGkj3Mk SY3Hjof%2FAK9ei2H9u6g2nzK32WMAm4gcZI9Bn0rxa9mjqhdM7deHZjMHJOMdMfnVS4kYOA5V ueqVlDRJ7qNit%2FJEWfeWB5XHb6VBeW4jyxuWZxxkNivlsTFLU9ehJ3sbFvbqZXZlI3DrV%2B1H loNynB5Bz0PtWHo8SzRsGkl3dRiTofatcwvGqqJn5BIBrTDwTV2TWk07F8CXz2jB2FuR7j2q y8bSRmORQPUjnmsb7U6EAkFRyHQ9KkW%2BWdyC7CRuQSepruso9Dk1LDWELAhV8xR1UjB%2FCoGj jgcbHYgj7vTFWobvzAQ%2FJHB2DoahvYgDuJZlHAOM%2FgaVlYoa18sQBG7njetOW7deQ2fw%2BY1C l1AgPmJ0HtSSXEIUsBhj0X0rJvqUtSZrkucKTEMclup%2Fwqs10FbgngY3Vmz3XJ3NwOhHSqsu pEkqiB8dzXPKaNYwbNKXVi5IXJGcYAx%2BZqpPdId0rDcw%2FKs%2B7uCBjaMnqVrMZ5ShwxA%2Bma55 z6nRGBfvtRcAtsEaN%2BdcxqGrM7bQ4Gexq7eXXlwsNuT05IFcrM5efAdVPtyK%2Bexk3J2PVoRs jp9PctEGZi59ugrQgZjLjOF9R61hWU%2FyBD5mwcfKcDP1rVhkSNN2cN2G7NciskjZ76npXhG6 ZFVDJkf3cYxXZAkkHqK8q8OzSCdC0hAOOB2FemWFwGiUZ3Yr7DA1OeB4WKg4yuW9xzk%2FlQGy emKMjHTmivTOAcWGOnX0ppG38aQZIpQQRzxSGmGQDj9aTgZBpVAIpgO%2FPbHFAWHqcjG2mvzn oKTeRQTu9vpR0sJgBlTzk0h60ElQe9JyOe1MQEZbANIzbRSB9re9IT60ogDNmos84I4xT3Az SOOBjigDDvPhZaMD5LmNu2Caybj4Z6gh%2FdXbYHY16izBxwcU5CACM4rzZYGjLodEcXVS1Z49 ceB9atBlG8wDtVT%2Bxdai5MBwPSvbhjHUEUjrG3JUflXFLK6LejsdEcfUSs0eD3VxqFlzNDIu O%2BM1AniaVFIYMB7ivdp9MtbsfvIl%2BuKoS%2BENNlJzAOR6CueWVST9yR0wzGNrSR49B4tVmA9%2B tW38VLKmHxntxXotx8ONKnyfKVSemBWDefCZN58iRlX0zms%2FqWLpfA7nRDG0pbnA6veRX0DY cA9eOK426lDS7Jm3L0w1es3vwru4gTE3mfWub1L4c6ihOLYtjsK5nHF03do7o4ulJaSPMtbE d%2B8Nmnyq2A23uK9F8IfDPSmtIw8SElRy3WuH1bwnq9hqaymykVFIyQMiu10PxI8ESJITGyjG GHNdVCpzztVRz%2Byp1pXbuXL%2FAOG1lo2ox3dsfLb0B4rXa6zCqrgkDBbtXM614knup1jSXapx yeeKvWtw726ru4xjd617lBxg7ROPFYWnTimmTTyjf3d%2B%2Ft%2BNVpJGkIAJA9R3%2BlSMBjaAAB15 60kfDYXknPNbSetzzEdX4Etkjuw2FyOmegrvbt0dCJAzrjkep%2FwrgPCQcXGY9pb0NegxyLHD mTBA7Hv70ovqKSOK8WxzeSxVFKsPlRv6ivlD4u%2FaXe5k8pIMME3Dgv7D0%2BtfXOsBdRMsnIUj bGo%2F9CNfPfxz8Epp%2BjS6zNcOyQ%2FMIQOGOa7KFXllYiULo%2BRfEWim%2FKRuQzscs7DOT3GR2rzi LwOpeZplaM%2Bcw%2B6SAPX8%2B9bnjvxn4j0%2BSX7FbW9xbuxJOMkd8YrzqL4v67balK13aoY5dqyR KMDA9PSvo4KTWhwT5b6nbafYrY6ilsBIFTpIowSPX6V7X8Or2zYmRXurh7RRLM8GEdh%2Fc464 NeK6T8R9L17TV%2B3MlpNNMV8puCE45z%2BVekeBde0%2B11%2FydMukSKKUEybv9Yo%2Fh%2FPNOba3CKUt j6q0XxClvDp97Dok8l5qKqssxGCijkCT3rqrLxBrcurahC0a2dqFxaFGyW9W%2FwDrV574V13V bqG7meaF5Lhf3NuoxhQeG%2BtdomqTj7JG7RqEOGKjknHevn6%2BIWqOunSdzoodS1GAwJPOHfGC SOHPp7GmRSzTzB5mG9c4HtWIv2pLuUmYm3mYEBv4D%2FhV69uNkRA%2BaVMbiOor56rNyZ6lOCib 2mX%2ByZhv%2BgrZ%2FtASDqenH1rzGbxHLayoiRbsn5gDyvv7iug0fVpdRQpJsAPRRwTXVRnyrUyq Ru7nUm8gDESF1fqABkH%2FAOtUomgmUr1ycgdqxlBUN8xJHIJPX0%2BlMW%2BSLAAYueozx71rOrys zUbm4Ls2cbMSdgHJI5%2F%2BvRb%2BIGngIQZ%2Bp%2BU1z0tzLO3yjzE%2Fu5%2Fz0qdbWWbEhiwvY55%2FGpVR yeg%2BS25pNezFiXi3qTwqqPlqKW%2FQRkcxufbmoJbh4V2InlnoSDVRke6kUNJuPYispzexUYiX d4JAME%2B4HU0kdu8qHgqDyBnmtO109tuBDu45NWTAVXCwgcfePapUObVluSS0MhdNk2hgnmGm XZFsCWYLxyo54960ZFljLbfnbt6Vi3lndTZaXbxwAtY1Fy6I0hZs53V7lJSxVkPpjtXPzTFW wZF3Doo61t6jA6Fz5GMZ%2BZjzWTHEZZgwG45HGBXz1fV6nrUrWRr2F2zWwDREN6nNS2l00s2x WUnPOBxVW9ubpYxbeVs3DnB7UzT3FqQAQT0OK59Ll2O60m58goAGkYdeK9P0G5M1qrFNo9DX kukTrkEjC9ME9a9O8NXqyw7Y0Yqo69q%2Biy%2BWtmeZi1odEDnp0pwOBj170bgRnGD7UzrX0D0P GZKDhciojwTTlBGc0EUxLQUY28GkxjIxTTwcfrQQevQ0rjTsOODgfnSFQD06UwZDZzTt%2BR70 CQjMG%2FCkP6Uj9M45pVyOvWgfQTg4PUUFcjPpQy88daYWOMdKokOQfp1ppIYYzSkg%2FSkcAYwS KT0Avi5wetS%2FaDj%2BuayHmJbg8mnrPnGTn2rk5jqcEaqXWOpzUonJGc81ll88dDQtyTxnmlzp EezXQ0xLnJLEYqaOcNz1zWZ5%2BBSiZlqlJrYTpXNUOAeOKcr54Jxms6K6O4bvyqYTnkg1amYy pl0OAeDQ6o3UKfwqmtxg9amWTIBz%2BdWprqTyyWwT6XaXSkPAjZ9s1i3Xw%2F0m5YuYEBP%2ByK3B LjFSbtwqmqc90NVKkNmcHqHwi028JMahPTAwTWc3wne2BWKZtvbPOK9OEnHBpRJmqVOn9kcq s5bs8juPhxfxqSjbs8ciqK%2BCdTts%2FuyffFe1ls%2BlNO3PTrUezT2Y%2FavseWaBpN7p90C8JA7s a665QSwLHxk8Z9u9dC8CMh%2BVc%2FSufvAY7kqTgD0qJR5DSM%2Bco3NtGiM%2BRkKQAOB%2Bdef%2FABV0 SHxj4TvNPeMshXggd%2FavRp4Gu0CZwP1rnNRsEhBG8uzcYPY4rNS5XzF76H5t%2BPvhxdaLdXaN bOqQttU8YB7fXNeP65oMUxkW5tIixbLMBhhX6VfEjwha3%2BnyQi2VyTln25%2FH618p698MBa6l NEIwud2Wbpj0%2FrXt4fFq1mc9SjfY%2BZpvCllN84idSgJVQ2c47VX03Q7zRp%2FtFlJPG6tuLryB z3xX0PbfBxYIPs7zRqXIZGZSRnHTPvzUlr8E3hS6EE0kiHG07ckHHQ%2Borv8ArULWMfYNdDP%2B G37Sc3hiFl1u0W5KKVjZQd5GPWvdrH9ofwi%2FhGDXbibyY5VIW13Ay7lHTHX8a%2Bd9e%2BE17bHb FAXkYbVVh9xTx3%2FGrHgr4KajFcSXE6eZCSYnRzwuPQV5tanh5rmbsbQdVOyPVNa%2FbP0GLTiL TTLpkYbTJIMbW9D7e9crP%2B1BruuXlqtrpjLaTq0ZnUZKHHy5P1%2FnSj4NxqFjnt44%2FJJIZOdw znBz1HNdLoXwrh04q9jEpLSbmg3fJgjnbXFzYOHTU6XCs7alHwN4o8f%2BIb63acQxiNiju7Y3 LnjA719K6alwsVtJKhjkIyxH971rnfCPga1tIkuSjRyE4aNvu9eOK9HtrC3SGRFTyzjIXOcf T2rhrVIT%2BFGsYtbjVkO0NJ8xJAOOKikw7kR5bJ4x2pWAI2ZI3cGprD%2FRT821x6n0rjTu7M3t ZXJLGyk3B3DK46MO1aTP8hzKB7AY%2FSmteb8CB1UjqpqIRrLKXlzwegNdUUlsYO%2FUhdZJX2hV OB1NXLTT2hX95tPuuaDNG42iPOOQwPf3p0V7IqcqSR3alypO7Fq9jWik%2BzxhgxHouP51Wkv1 LnIyoP8AdyKoST%2BadzlWIHAzTWvPKRSHVUHqOKTq2BRfUtveIykiHAbozcCsPUr6GyG7Bmbs FPSnXesvyiKJD6%2F1rB1O8t44zvffKei56V52JrWWh2Uad2ZWo6mL%2Bcs5aJRkMOxH1qnDeQW%2F zWmWx7bgPxplw4vY2DXBVAcYC1Vjm%2BzqyK5KDjG2vnpyu7nrxS2RcW%2Be6nG5dz%2F3u30q7Ayw sHZE47Y6Vgx6kIpsgFQexHU1dtr8SSL5vynONrVkn1LcDtdMl3FZH24xwBXoXhrWF%2BVTiMdM AcmvKLd%2FMYeW%2B0e3QV3HhS5XzFVmQ46sRXs4Ks1NJaHDXp3hc9Pjn8wAqDipN3Q1XsirxqR9 3HWrLD5hgGvrYu6uz56Vr2E34HFPGMc0nDe1NOM96okAAT60rZpgBAzmnMd3XgimnoIRTjGa ON1AXHr6UhTaBzikDA01xuNOGCeelJkZoAaSF%2FGg4780Ecn%2BdNYnimN6CMBjg4pGwAOaAu7N MP3unSkSUBP8x55p5mKDOfxrNWXA681KJuM8n2NeUpXR6BpJdZ%2B9nmn%2BaCeDwKy0nAb%2BlSif Z3zVJj5TVjfIqQOWU84IrMFyVBp4uCe%2BB7U73E1c0PO555qRLjK4AH41meb8xxk1JE7Z4pKV mDV9zTE2cZNSpcYOASfXNZzTng%2BlO8%2FABJ4qlIzcUaZuexxT0uenXissSiQcmpVm2jir5%2BpL po0hMM9etO83J65rOW4DKOcH1qVGyOuavmRl7OxdEoyO%2FvUglOOaoB8HHNSBz35q%2BZolwRdD 5HvWNq9uWYSAcd60UfJAxUN%2FGstu2cnjsamTuhQ0kY886hSqhQAOveub1Mt1GN2cY7c1qzLy Vzt59c1lXVuWlX5s4NcspOS0OtRtuY09m1zvTblUHzk88mvLPHHwui1CUzWpKEA8diT%2FAFr1 wDKuATHlyTj8qZJFA7iJgAP7x61PM46plpLax4LafDi7miVJTjA2Hjp6Vf0zwfJZP9ldSqgF S55zz3Nes3tosLMAuc9CorNnMRkVXAHByT3qXWls2WoHnmseEre4l3vBvYoF3Hr7Gmw%2BFkS0 W3EO8E8Fe3P9DXfXJto4yGG4ewqnFdAwAIm0kdcdO2c1k6knoaKKRytl4DZpTLN8xB%2B6eQa2 7TwjFAnzqqbeRjgr9KviWVSWBOCecGm3Ny6j%2BNvSs0n1K5i%2Fb2sVrEMEZ67vWnS3Bb7oBI6c 1i%2FbdwwJCD0KuKUNKMHaMjncp4NWQX5El6shJPemrKkbDfxnqRUcV35ikISWz0NW4LB7jBcB ge2OtNa7D0W5LBIOMMMDrkdRV7crMpUKd3Un%2BlVo7HyfVowenUitG2EQQh1LJ67c4rqgmtzn m09SaLSxKm4OFbqOeKhmtZHOHGwA9euauBLeLhZic9hxiql7GUVjC28HkgtW0rWM1fcqSKyM Rjd9OKq3epxwJt2Z9VYiiUiND5juH9CcA1iTRzGRidjJzgDk4rzKsnFaHZTjdj551jRpmwq9 QCciud1G%2FJlSRYg65wPLq5qL%2BWnMJZe%2BT0%2FCsc3IkyqInHAODXgVakm9T1acFa5YS7WcjzYj G%2FP3uePwqle2sMbFo5PvddpzTrm4NlAxdH56knGK5%2B61FHVdjkPnn5scVxu7O6FPqLc6g4%2BR gMqcbiPmNaGlNGmGKySMeST2rLt5UdsEY4%2B%2Fmt3TIvMIxyO%2FPWtF7qsx1Njo7S4VI1CKFHoT XR%2BHJ%2FIuUlbnn7gzXFtGyToqHLdx6V2WhR8hZCFBxkitqUm53RxzSStc9u8NXaXtqrbFUkDN bZgj67RzXM%2BEGhSzURqdp4BPc1028kfSvs6NRuCufL14%2FvHYQwR46UGCIjpk0pkOKjL7ifat XM51Fjvs8WBx%2BdIbeIk8Cg%2B%2BaC%2B2jnZXKN%2BzR56UGCPsAaC59hTN5A7GlzhZitbxsBnim%2FZI wflGaccnH880jPtOATmlzlJEbWcbHnil%2BxRbRxUgOAcmml%2BnvVcw2hPsMQ6fzpjWURJ4p7SZ 6Ux5sYGQTQ5WJ5ThFcKcjt3p5lJOSarq%2BM0DJI5%2FGuDoekW%2FN3dOtDSnIycA1CrELjg0ZO35 uR%2FKhMRbS4PTOfepEmxgZGfaqKMARxUpcDnvS2AvCYg8EHjtU6TYXgn6Vmq3APNTeZnjt70J jLvmbuad5uB%2FSqIkKkDrUyyjGD3qriLkb7TzUpmJBxkY9qohsEbTxT%2FOI%2BU8VVxWLUbnHP8A Op1mKjqaz%2FMCmpVm6Yp8xNjQjnJPXpU0b571nLMAamSbJx1xVqRDiaKy7SPeotQnHk7cgE8e 1Ql8AHjHrVK%2BkdgwDZGOlKc9BRp63Oburt7W9dScqT%2BVNmuQxDAkg1DqaszZxnFVPOJXnr6V 5iqOMrM7uRSSsWQBluM4%2FSs6cEy%2FKSPercNyrDqOeCKrSjLsRW%2FMmtDFJplOW4ImCbuT1%2BlM miR3J2g8VG6guz8EngZ9KYCyFhnj0rBy1NbIiukSFGO0DHJHqKzrUxTRheQRkrn3qzNc7gwK kjr%2BFUZUaKaJhgqw4%2BtacyWqHYbdboACVLL0JXtTVTfGCr5XHf0qwJVkYg8HGTVX5YpAm7CE 5Bx0NPmRKiNeMNLtZF3DnPt60RQyI2VJC5%2B6TT5U%2BYHqfQmmTTqiK%2Bc%2FhSumOxoWtolxLtdD GTyHWtmK2ewI3nzYzj5h2qlpgM0StGQxHIUgVs2uojlGKr2KMK66dranPUvclijjmJJlVWA4 Vh1FQXEZiwQV54G3j86LuSPqFCsvORVXz%2FLAkRjIp4MZOc1u5pGNmQSthyfN8sg1At8VkwHE mB34pk18l3MIQgU45UnB%2FCn%2FAGTYhbIX031zSd9Ubx2sytcu08haRMJjjaOKpyw%2FJuGVU8el LNHctL%2B7K4zydp5qKe%2FaMeS0e%2FHBIXqa8%2BtLSx1wVmY93mCT7hk%2F2c5%2FIVj3d7BbElnML84Q Dkmukkt0dfNdAT2ANc3qVwBuMcQD9AdoJFeJPTc9Sk7s5fVLqeZ9w4br85zVSOczEB4lLegr Tntp7lw0wOM8DOBT4rVWfyxbjPTcahNWPR5lFD9NhjeQARe2etb9kohcKIiD03NyT%2BVWtM0K GKPzZhuJ7LzV5It7MsMW1T3PAFU4tnBOomytaQmeY7VJcdcDAz9a6nS4XiZV3guTnAGKr2Wn OqrtGCfwratYBb4KnMhIy3auilRlHU5pVL7He%2BEjKCBMT%2FsrnArsvMYj5eDXG%2BE4PLQNuO5h 1PUCutRtoHPFfS0NII8KvaUrkxfaBnqBSFs4NRkkn1FIxH0roejOexKx3d6jJO7GaOFA5zQG Bznt0p7jDd0pwANQGTigSHPHNAWLB6AZyajJwxOKaG4JPFNMhC5b8KfQCQOPpTGk4POKjYlu RTSDtxgE0FJdxTLnj0prZzkfjRkqMGmjDn%2BftU6sehw2fSlR898VAJDjmlDcVy3OmxP5jqwP GD3qQSdsZzVXzMn2qROeQaBlkHnPFOGBVf7pOSadu6c09Bos%2BYVwPalEvuRVbzTtwetBlUDg k1LEXI5uB9cU8ksw5qmkgLAdM1OrgGmrgWxLsIB61IJN2OapGQcZp6P1OfwqtwLpbGCcc0u8 D6CqyyGRT2pwU9T1osBaVwSOT%2BVSxS4bCnmqYYEEHrTg5BHrTEzRE%2BBg1BeMvlnABOKIjuX3 qO5jYLnIxSd9wRiXQ3Kw9ayZofl4rZuIzg5GDVOYcYxgevpXHVhzanRCVtDnppGhbI655FTL eh4ySefTNSzwfOcY9cnrWVewuikrnNc0W4F6SLhIaIY5b1qu42d8571nLfvCRubcvr6VYk1C F4%2FlYcCnzp6hYSSPc2R0HX3qnc%2FLHk8YOQKkivUYMM7VHbPWo71w0TDswx%2BlCl2FYheLa4dT gHrVSRz9rRcDHU8VKdRSJBGW7YquJVdTKjZYcA1LkMtsPMO1cBRyD6VWjXYjnIZOuG%2BtQxXa yQSjPzr3HeqjaovyRlT15x29KdyTdtLgWu1EUFWBIxnIp0mss12iN0I4b%2BdYr6gVIAySARx1 rPF01zOFQYAJDnHT3rRVGlYVkdsmrfu2O4ggY2sMkfSqaXhvFAyY268kDNUrG0f%2FAFjbmCHa T3Nak1nbq0bFUJfpuP8ASto8zVyNFsTRafbI6yyANNjnBNTy%2BTFD5jRsqL0GelRtc29mfJhg kkmwSGx8o47Vmzw3kreYTtjHZmyBWjdtCUnKzNCG7h%2B%2FFJuzjK5%2FpVebVFdiqxbmOevAH1qV Y3toQ62yuT0YLVO5lmkfcFQcYZcZNctbRI6ILUxtRinkdjHmV84wmMCufurO7Z%2FnnOfQ8Y%2Bl dVdzQ2yMzOPMPVScAVl%2F2xFcMsIiWVT02DP615E6bbO2E1E55oLg5REdyerntWzpWl%2BUA1yQ 2BnG3muqsdC82KNmUBDztHH51pLodpGPuFpD1JOf0rSlhW9QliEY9rP56hYYNwzjk7R9a0re 1EBGU8yQ9FAyBWpBpUMUAIYQgevJFSx2wHKguRwZDxn6V6UcPZ6o4pVeYrwxLEoZvvE8qDk%2F %2FWq5pzC5lHygKDgAjk04WhCEkbAeTjrU2nLsufLGQP8AZrfkSaM09Dt9FQonOM8ZwK2yemRi s3SgFiCrwQMkDk1eZznBIx7V6MVZaHDJ3ZIrbcjt60wtkEc496aOeM5x3pG5ODVtEJEgOe9N YnjA5pnTPIHvSmTBBbP4UJD9BxBx1poJyewNNd%2BAQTTNwHGTnrSdrjWxM5AI%2BbrTHY4wTimH n5vSmuxfA6DrTtckcZDk56dhQsh2np%2BdR5JOfyps03lKAOppjJW57%2B1AYD5R1HWq7FtvBznv R0IGfxqgPPxLz6%2FWnebg9c1XDYXOM08SDHPB9a887fMs7w%2FOaekvIx1FUw5J4PFSq4Ck0AWW f5sU4yYwaqF8tzwaUOQfT3ouIteYQQKeHBfPXNVg%2FB%2FnSq4BzkimMt%2BYVfjIqRZc4xx71WWQ EY608HZximSy3uzjnrTlkwCKpiQnjPQ1LuAGO9HURcEnIPQVMs2Bwc1no%2BQO9Sq4C571TYFs TAn15qQsccH2qmHUkYOKcsgwQDxVCuXoJCX2k5HGCa0HjDoDkL9Kx7eQ%2BYABk59a3hD%2B7B5z SSvKwnojIuICxPPPXms%2BWPAYda3Z0Ubv6isa8VlzgfKewq3TutTNT1MS5KI2G47VnSKkpK7j %2BNbFwiEFWT8TzWZdQGJSUUEema5ZQsjpjLuYWoWRCEgA%2BhUVyV6txbSFl5GenvXZS%2BZlizYT 2rLubdJshgD3GBivPnC50J2OWS7ujkKcr69xU8upTtHgOF7das3Nh5RIaEhezj1qo0USH94A Bn7wGaya5TTcy5LuRU8tXDNk5PalXUZxD5eMZJ%2Bb29a1X0%2B0mtt8b4OTz71BFoiPMG8zDMMH Jzx7CqSuSVoZZj5YUHaowCBjJq6ElmwuMnowHp9atf2DMjAq7bM4%2FdDOPrW5YaVIwCRhU29H cHmuqFNyRhKVjDsLOWeXaOR1HHIrasdB8t5Cx2yONpG3pmteG2EHylQsrYBcCtDMUCBnkUjH zEnoa640Yx3Od1L7GZBpcVtGQXfCnBIPJ%2BoNMe1t55g8m1nUY2459qdf3UzKTAVIJxmTnNQa ZmESfac%2FacZ6ZwPrWyS6Eq%2FU02EVqgXOGwBg9vSqpluHVipTgkjccCjcsrABjJK5ICqM7Md6 vJZrEV3YBI64%2FnWDjd3NU0kUI2cgJI7Pnqw4UfSo57MzRkGXy4s5AXgn8a0Z7QSMpTc%2BTjAH Wn%2F2eWGwxqy45B6596hwuVznNw6Bay3AMkTyjspOVNbtj4f0%2BzIdbaOPjgAVqQ2yWcYIT5j7 cD6VegLyRfLEkeP4mGTWkaK7EyqMyZLORwcYjU%2B3NEWlznhTuB6E1sTdjkMR6nHP0pqRTlS2 G2n0FXGCT0Ic3YpLpkqMA7AnGeOlDWsw%2BWMj654FWJJGUZdsAfw1Wa6kclQG254Crx%2BdbuKa M05dRJA1uuZGEjAcAHioLO5lW9DvypOAueMVPJExUNI209NtZ090EkUqucHHJxXn1XynZTVz 1HT7sTW8ZAVeO1WywDcnI6VheH33afG3IZh%2FFzWr5ucjOcV6FN3imccvdbRPkY2jp3pjuBwT yfSoi%2BCMd%2BuabvwST39a1RJN520bQAAKN3fOarmUHIoDE%2F7PrmhC3LBJIyaa7cZH457VAZh6 5x78Um8uxO4gelOwXJd6nJU0vmY4HXvUQfZkgjA9aY8gJ4bJPNJE3uT%2BZ8uc49DVYN5jknp7 02WQkYHT0pgYgY5x9aYFgyYXkgHsKaH9TgmogBgnOAB35NIuMZPXrTEefmUbeAeKcJOBmqgl 3MQBwKeDzmvLuejYuBsHHY0F%2BPeqvmHPU9akV%2BepOfWmSWQxHIOaVZMnOSR6VB5nFPTjk8k0 MEWUb3xUmMgk4qscgHng0GUYHB6VVgLUThTyalaXJJqkpJBp5c46D60kwLIlA596l84Nzmqc cncjOR1qRJN6%2FSrROxZE2D0yBT0lG7I4%2BpqqWx0%2FWnIxBHvQItiQ7geKl3jkg5PpVPzSR0pw lJUY471d7CsXba48uYMcYzXU2N4k6jqMda4lpOhOTk4ro9KkCRDaOfesfaqM7Fum3Fs0bkgL lRu9j1rGvGGD8uPTNX5Zi7YHB9ayrtmyST07V286kjl5bMzbkbgSAcj8qy7gnBI4HpnNad24 24xzWPeSALwDnpXNM3juZF40bZU5GO47VlPG8ZbM2F6jNa7LuYyYHHBFVtSsmeHcpVVxkDvX JKN9UbR7GYSG%2FiY%2FyrPv7UeX8gB9%2Fep7a68olHGcDOVouJCCj4BQnp0NczNVuZttBK8LIWVW 6nBzx%2FjV%2B2jYSBHQs38Dj0qwiJHIGUYJ7jg1o2qhAqZbY3T1FaU4JsTdtCrZgzyPDJGwccb0 bFWluW09sRRTSgenzE1cEQQqjouw%2FwB3gmtMGOJVREyyjgntXpQikjkk7asqpe%2FbtrMvkrxn cuDmllRZ2G2EyJ0MpOF%2FKp72R7WIswRieCcdqy4dQlVFfOEDYCKMACrZCNKPTI2DPu2Z4355 %2FKnPbYiICo%2BB0x29c%2F0rNl1l4TvdAzDpj0zV61kmuFd94AOAw9sdqE0GpDNaTWFsz2rYKgsS Rx%2BFZmk%2BIjchkuMibPIdccetdMLLII82QIoB65piWUF6xLxjYD26mp5ObVBdIdbXRKgR5fd3 HSrir8ymTlz0A6Cs3ULT%2Bzk3xyFI2H3VHP51PpV0t0F%2B9jAPPerjHWzC9lc1IkUNumYcdAOo ou7%2FAGLtRCF7buKRrtLJSyKzFuxxgVAr3F%2FKOUUe%2BTWtraGbfUWDLOXk78jnrVx7ssmA4A7D NU7q1kTAMgzjkAcU61sig3YQ8dcc0K6dg8y5AsbAZGfU1Fd3qRZWNOfUiql5eyW3RVP41Ql1 G5ZgW8sIeyjmspysrI0SuSSXE0jsSVBHtWDqc7sdpfPYYGKv3N3IuQDtPXIrm729kZ%2FvHO7A zXg4mpfQ9PDwZ6l4W3rpURLt25JrdSXBOe3p3rmfCMpfTUyBwM59a6ASlQAB1r3aP8NM82tp NkzzAdM5ams%2BAucnsKjDtK7E0OcOCK6LGN%2BhIp2kDb19aU5zyenTNQ%2BcyknPXio3Lg53c9aW widwVYdqVg2d2eDxUAmY9ec96HkYEAkkelUDZK8gACnnHOahEoY5JwfQVG0hdTnuaaGKgjA4 pEolMmSM%2FlTwx5OPaqqyFyfXvUhbaQCSRjNMbJeTxnikyQxwc44pFAUMecD8%2BaapKr649aoR %2F9k%3D"/>')
			break
		}
	}

	attackTimer = setTimeout(attack, 100)
}

var g_ShutUp = false
var nextInterruptOther = 0
function onVoice(voice) {
	if (Date.now() >= nextInterruptOther && !g_ShutUp) {
		nextInterruptOther = Date.now() + 1250

		bark()
	}
}

var commands = [
	{
		command: /!setsecret (.*)/,
		action: function( context, secret ) {
			if (context.actor.hash !== Owner)
				return context.actor.sendMessage('403')

			if (secret && secret.length > 0)
				MEMORY.secret = secret
			else if (MEMORY.secret)
				delete MEMORY.secret
			saveMemory()

			context.actor.sendMessage('Secret changed')
		}
	},
	{
		command: /!skinallen/,
		action: function( context ) {
			if (context.actor.hash !== Owner)
				return context.actor.sendMessage('403')

			playSound('snd/skinallen.mp3')
		}
	},
	{
		command: /^bosco/,
		action: function( context ) {
			if (context.actor.hash !== Owner)
				return context.actor.sendMessage('403')

			g_ShutUp = false
		}
	},
	{
		command: /!shutup/,
		action: function( context ) {
			if (context.actor.hash !== Owner)
				return context.actor.sendMessage('403')

			g_ShutUp = true
		}
	},
	{
		command: /!secret/,
		action: function( context ) {
			if (context.actor.hash !== Owner)
				return context.actor.sendMessage('403')

			context.actor.sendMessage('Secret: ' + MEMORY.secret)
		}
	},
	{
		command: /!addadmin (.+)/,
		action: function( context, hash ) {
			if (context.actor.hash !== Owner)
				return context.actor.sendMessage('403')

			MEMORY.admins[hash] = true
			saveMemory()

			context.actor.sendMessage('Added ' + hash + ' as a bot admin.')
		}
	},
	{
		command: /!removeadmin (.+)/,
		action: function( context, hash ) {
			if (context.actor.hash !== Owner)
				return context.actor.sendMessage('403')

			if (MEMORY.admins[hash]) {
				delete MEMORY.admins[hash]
				saveMemory()
				context.actor.sendMessage('Removed ' + hash + ' from admin.')
			}
			else
				context.actor.sendMessage(hash + ' was not bot admin.')
		}
	},
	{
		command: /!listadmins/,
		action: function( context ) {
			if (!userIsAdmin(context.actor))
				return context.actor.sendMessage('403')

			const hashes = []
			for (var h in MEMORY.admins)
				hashes.push(h)

			context.actor.sendMessage('Admins:<br/>' + hashes.join('<br/>'))
		}
	},
	{
		command: /!listhashes/,
		action: function( context ) {
			if (!userIsAdmin(context.actor))
				return context.actor.sendMessage('403')

			const hashes = []
			for (var i in g_OnlineUsers)
				hashes.push(g_OnlineUsers[i].name + "=" + g_OnlineUsers[i].hash)

			context.actor.sendMessage('Hashes:<br/>' + hashes.join('<br/>'))
		}
	},
	{
		command: /!bark/,
		action: function( context ) {
			/*if (!userIsAdmin(context.actor))
				return context.actor.sendMessage('403')*/

			bark()
		}
	},
	{
		command: /!attack (.+)/,
		action: function( context, name ) {
			if (!userIsAdmin(context.actor))
				return context.actor.sendMessage('403')

			const users = CLIENT.users()
			for (var i=0; i < users.length; i++) {
				if (users[i].name == name) {
					context.actor.sendMessage('k')

					attackTarget = name
					attack()

					return
				}
			}

			context.actor.sendMessage('404')
		}
	},
	{
		command: /!heal/,
		action: function( context ) {
			if (!userIsAdmin(context.actor))
				return context.actor.sendMessage('403')

			if (attackTimer) {
				attackTarget = undefined
				clearTimeout(attackTimer)
			}

			context.actor.sendMessage('k')
		}
	}
]

var httpserver = express()

// Security
httpserver.disable('x-powered-by')

httpserver.use(bodyParser.json())
httpserver.use(bodyParser.urlencoded({ extended: true }))

httpserver.use(function (req, res, next) {
	if (MEMORY.secret) {
		if (req.method === 'GET') {
			if (!req.query || req.query.secret !== MEMORY.secret)
				return res.status(403).end('no')
		}
		else if (!req.body || req.body.secret !== MEMORY.secret)
			return res.status(403).end('no')
	}

	next()
})

httpserver.get('/', function (req, res, next) {
	res.end('woof')
})

httpserver.post('/gmadmin', function (req, res) {
	if (!CLIENT)
		return res.status(500).end('not connected')

	const steamid = req.body.steamid
	const name = escape(req.body.name)
	const message = escape(req.body.message)

	const msg = '<b>/ADMIN FROM ' + name + ' (' + steamid + ')</b>: ' + message

	const users = CLIENT.users()
	for (var i=0; i < users.length; i++) {
		if (userIsAdmin(users[i]))
			users[i].sendMessage(msg)
	}

	res.end('ok')
})

httpserver.get('/userlist', function (req, res) {
	if (!CLIENT)
		return res.status(500).end('not connected')

	const results = {}
	const userlist = []

	for (var i in g_OnlineUsers) {
		if (g_OnlineUsers[i].name.length > 30)
			userlist.push(g_OnlineUsers[i].name.substring(0, 27) + '...')
		else
			userlist.push(g_OnlineUsers[i].name)
	}

	results.success = true
	results.userlist = userlist
	results.usercount = userlist.length

	res.end(JSON.stringify(results))
})

httpserver.use(function (req, res) {
	res.status(404).send('404: page not found')
})

httpserver.use(function (error, req, res, next) {
	res.status(500).send('500: internal server error')
})

httpserver.listen(9002)


// ready to go
connect()
