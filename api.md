# Travel express API

## User

Fields   |Description   |Type|Meta
---------|--------------|---|---
_id      |Identifier    |String
email    |Email address |String email format
tel      |Phone number  |String tel format
password |Hashed password|String min 6 | private
firstName|First name    |String min 2
lastName |Last name     |String min 2
vehicle  |Vehicle model |String | default empty string
seats    |Seat count    |[1-10] | default 2
luggageSize|accepted luggage|[small, medium, large]  | default medium
talk     |Want to talk  |[no, little, yes] | default yes
smoke    |Allow to smoke|Boolean | default no
token    |Current JWT   |JWT String

---

Request|Input|Output|Access
---|---|---|---
GET /api/user/:id|user id|user object|public
GET /api/user|  |user object|[auth]
POST /api/user|email, tel, password, firstName, lastName|user object|public
POST /api/user/login|email, password|user object|public
PUT /api/user|fields to update|user object|[auth]
DELETE /api/user|  |  |[auth]
GET /api/dev/users||user objects|dev
PUT /api/dev/users/:id|user id, fields to update|user object|dev
DELETE /api/dev/users/:id|user id|  |dev

Note:
- Phone number regex: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
- The JSON Web Token has to be passed into the http header for the [auth] requests : `Authorization: BEARER <JWT>`
- Dev routes will be disabled in production

## Trip

Fields      |Description   |Type 
------------|--------------|---
_id         |Identifier    |String
user        |Transporter   |User Object
fromLocation|Starting city |String
fromDate    |Starting date |Date time
toLocation  |Ending city   |String
toDate      |Ending date   |Date time
repeat      |Frequency     |[no, daily, weekly, monthly]
endRepeat   |end repeat date|Date time optional

```http
GET /api/trip             # list
GET /api/trip?...         # search
GET /api/trip/:id         # detail
POST /api/trip            # create [auth]
DELETE /api/trip/:id      # delete [auth]
```

Search query with optionnal fields :

```http
GET /api/trip?
    minFromDate=
    &maxFromDate=
    &minToDate=
    &maxToDate=
    &fromLocation=
    &toLocation=
    &minSeats=        # min val
    &minLuggage=      # min val
    &minTalk=
    &maxTalk=
    &smoke=
    &page=
    &pageSize=
```

Note :
- Date time are formated as js Date object
- Trip are repeated when list/search queried with updated from/to date

## Reservation


Fields      |Description   |Type 
------------|--------------|---
_id         |Identifier    |String
trip        |Target trip   |Trip Object
user        |Who reserve   |User Object
seats       |Amount of seat|[1-10]
paid        |Is paid       | Boolean

```http
GET /api/reservation            # list
GET /api/reservation/:id        # detail
POST /api/reservation           # create [auth]
POST /api/reservation/pay/:id   # pay [auth]
DELETE /api/reservation/:id     # delete [auth]
```

Search query with optional fields :

```http
GET /api/reservation?
    tripID=
    &userID=
```

## Location

Location query for auto-completion sorted by popularity

```http
GET /api/location?
    search=
    &limit=
```