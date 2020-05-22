# Travel express API

## User

Fields   |Description   |Type|Meta
---------|--------------|---|---
id       |Identifier    |String
email    |Email address |String mail format
tel      |Phone number  |String tel format
password |Hashed password|String min 6 | private
firstName|First name    |String min 2
lastName |Last name     |String min 2
vehicle  |Vehicle model |String | default ""
seats    |Seat count    |[1-10] | default 2
luggageSize|accepted luggage|[small, medium, large]  | default medium
talk     |Want to talk  |[no, little, yes] | default yes
smoke    |Allow to smoke|Boolean | default no
token    |Current JWT   |JWT String

---

Request|Input|Output
---|---|---
GET /user/:id|user id|user object
POST /user|mail, tel, password, firstName, lastName|user object
POST /user/login|mail, password|user object
PUT /user/:id|user id and fields to update|user object
DELETE /user/:id|user id|

Note:
- Phone number regex: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
- The JSON Web Token has to be passed into the authorization header for the [auth] requests

## Trip

Fields      |Description   |Type 
------------|--------------|---
id          |Identifier    |String
user        |Transporter   |User Object
fromLocation|Starting city |String
fromDate    |Starting date |Date time
toLocation  |Ending city   |String
toDate      |Ending date   |Date time
repeat      |Frequency     |[no, daily, weekly, monthly]
endRepeat   |end repeat date|Date time

```http
GET /trip             # list
GET /trip?...         # search
GET /trip/:id         # detail
POST /trip            # create [auth]
PUT /trip/:id         # update [auth]
DELETE /trip/:id      # delete [auth]
```

Search query with optionnal fields :

```http
GET /trip?
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
id          |Identifier    |String
trip        |Target trip   |Trip Object
user        |Who reserve   |User Object
seats       |Amount of seat|[1-10]
paid        |Is paid       | Boolean

```http
GET /reservation            # list
GET /reservation/:id        # detail
POST /reservation           # create [auth]
PUT /reservation/:id        # update [auth]
DELETE /reservation/:id     # delete [auth]
```

Search query with optional fields :

```http
GET /reservation?
    tripID=
    &userID=
```

## Location

Location query for auto-completion sorted by popularity

```http
GET /location?
    search=
    &limit=
```