const faker = require('faker')
const db = require('./db')
const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router(db())
const middlewares = jsonServer.defaults()

router.db._.mixin({
  createId: () => faker.random.uuid()
})

function hasRole (role, obj) {
  return obj.hasOwnProperty('roles') && Array.isArray(obj.roles) && obj.roles.indexOf(role) !== -1
}

function addExtraFields (req, res) {
  if (Array.isArray(res.locals.data)) {
    res.locals.data = res.locals.data.map(obj => {
      obj.isAdmin = hasRole('ADMIN', obj)
      obj.isStudent = hasRole('STUDENT', obj)
      return obj
    })
  }
}

function removeSensitiveData (req, res) {
  if (res.locals.data && res.locals.data.password) {
    delete res.locals.data['password']
  }

  if (Array.isArray(res.locals.data)) {
    res.locals.data = res.locals.data.map(o => {
      if (o.password) {
        delete o['password']
      }
      return o
    })
  }
}

function normalizeLinks (links) {
  return links.split(',')
  .map(link => {
    link = link.replace('<', '')
    .replace('>', '')
    .replace(' ', '')
    .split(';')

    link = {href: link[0], rel: link[1].split('=')[1].replace('\"', '')}
    return link
  })
}

function normalize (req, res) {
  const total = res.get('X-Total-Count')
  // const links = res.get('Link')

  if (total || Array.isArray(res.locals.data)) {
    res.locals.data = {
      items: res.locals.data,
      total: total || res.locals.data.length
      // links: links ? normalizeLinks(links) : null
    }
  }
}

server.use(middlewares)
server.use(jsonServer.bodyParser)

server.post('/api/auth/login', (req, res) => {
  const {username, password} = req.body
  const user = router.db.get('users').find({username, password}).value()
  if (!user) {
    return res.status(404)
  }

  const isAdmin = user.roles && user.roles.indexOf('ADMIN') !== -1

  return res.json({token: faker.random.uuid(), isAdmin, ...user})
})

server.get('/api/enrollments/:user_id', (req, res) => {
  let { _page = 1, _start = 0, _limit = 15, _order = 'title', _sort = 'asc', _end = undefined } = req.query
  const {user_id} = req.params
  console.log(user_id)

  const user = router.db.get('users').find({id: user_id}).value()

  if (!user) {
    return res.status(404)
  }

  let chain = router.db.get('activities')
  .filter(o => {
    return o.registrations && Array.isArray(o.registrations) && o.registrations.includes(user_id)
  })

  if (_sort) {
    const _sortSet = _sort.split(',')
    const _orderSet = (_order || '').split(',').map(s => s.toLowerCase())
    chain = chain.orderBy(_sortSet, _orderSet)
  }

  // Slice result
  if (_end || _limit || _page) {
    res.setHeader('X-Total-Count', chain.size())
    res.setHeader(
      'Access-Control-Expose-Headers',
      `X-Total-Count${_page ? ', Link' : ''}`
    )
  }

  if (_page) {
    _page = parseInt(_page, 10)
    _page = _page >= 1 ? _page - 1 : 0
    _limit = parseInt(_limit, 10) || 10

    chain = chain.slice(_page, _limit)
  } else if (_end) {
    _start = parseInt(_start, 10) || 0
    _end = parseInt(_end, 10)
    chain = chain.slice(_start, _end)
  } else if (_limit) {
    _start = parseInt(_start, 10) || 0
    _limit = parseInt(_limit, 10)
    chain = chain.slice(_start, _start + _limit)
  }

  const items = chain.value()

  return res.json({items, total: items.length})
})

server.get('/api/popular', (req, res) => {
  let { _n = 5, _order = 'title', _sort = 'asc' } = req.query

  let chain = router.db.get('activities')
  .filter(o => {
    return o.registrations && Array.isArray(o.registrations)
  })
  .sortBy(o => o.registrations.length)
  .take(_n)

  if (_sort) {
    const _sortSet = _sort.split(',')
    const _orderSet = (_order || '').split(',').map(s => s.toLowerCase())
    chain = chain.orderBy(_sortSet, _orderSet)
  }

  const items = chain.value()

  return res.json({items, total: items.length})
})

server.get('/api/recent', (req, res) => {
  let { _n = 5, _order = 'title', _sort = 'asc' } = req.query

  let chain = router.db.get('activities')
  .filter(o => {
    return o.registrations && Array.isArray(o.registrations)
  })
  .sortBy(o => o.registrations.length)
  .take(_n)

  if (_sort) {
    const _sortSet = _sort.split(',')
    const _orderSet = (_order || '').split(',').map(s => s.toLowerCase())
    chain = chain.orderBy(_sortSet, _orderSet)
  }

  const items = chain.value()

  return res.json({items, total: items.length})
})

server.post('/api/auth/send-email-reset-password', (req, res) => {
  const {email} = req.body

  if (!email) {
    return res.status(400).json({error: 'email is required'})
  }

  const user = router.db.get('users').find({email}).value()
  console.log(user)
  if (!user) {
    return res.status(404).json({error: 'no user found in our records exist with this email address'})
  }

  const token = faker.random.uuid()

  const tokenObj = {
    id: faker.random.uuid(),
    token,
    email
  }

  router.db.get('tokens')
  .push(tokenObj)
  .write()

  return res.json({sent: true, token, email })
})

server.post('/api/auth/reset-password', (req, res) => {
  const {token, password, password2} = req.body

  if (password !== password2) {
    return res.status(400).json({error: 'password missmatch'})
  }

  const tokenObj = router.db.get('token').find({token}).value()

  if (tokenObj) {
    return res.status(404).json({error: 'token invalid or expired!'})
  }

  router.db.get('users').find({email: tokenObj.email}).assign({password}).write()

  return res.status(200)
})

// server.use(mung.json(addExtraFields))

router.render = (req, res) => {
  addExtraFields(req, res)
  removeSensitiveData(req, res)
  normalize(req, res)

  res.json(res.locals.data)
}

server.use('/api', router)

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

server.listen(PORT, HOST, () => {
  console.log(`JSON Server is running on http://${HOST}:${PORT}`)
})
