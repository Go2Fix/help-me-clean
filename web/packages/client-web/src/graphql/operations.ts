import { gql } from '@apollo/client';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const SIGN_IN_WITH_GOOGLE = gql`
  mutation SignInWithGoogle($idToken: String!, $role: UserRole!, $referralCode: String) {
    signInWithGoogle(idToken: $idToken, role: $role, referralCode: $referralCode) {
      token
      user {
        id
        email
        fullName
        role
        status
        phone
        avatarUrl
        preferredLanguage
        createdAt
      }
      isNewUser
    }
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken {
    refreshToken {
      token
      user {
        id
        email
        fullName
        role
        status
      }
      isNewUser
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

export const REQUEST_EMAIL_OTP = gql`
  mutation RequestEmailOtp($email: String!, $role: UserRole!) {
    requestEmailOtp(email: $email, role: $role) {
      success
      devCode
    }
  }
`;

export const VERIFY_EMAIL_OTP = gql`
  mutation VerifyEmailOtp($email: String!, $code: String!, $role: UserRole!, $referralCode: String) {
    verifyEmailOtp(email: $email, code: $code, role: $role, referralCode: $referralCode) {
      token
      user {
        id
        email
        fullName
        role
        status
        phone
        avatarUrl
        preferredLanguage
      }
      isNewUser
    }
  }
`;

// ─── User ────────────────────────────────────────────────────────────────────

export const ME = gql`
  query Me {
    me {
      id
      email
      fullName
      phone
      phoneVerified
      avatarUrl
      role
      status
      preferredLanguage
      createdAt
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      email
      fullName
      phone
      avatarUrl
      role
      status
      preferredLanguage
      createdAt
    }
  }
`;

// ─── Services ────────────────────────────────────────────────────────────────

export const AVAILABLE_SERVICES = gql`
  query AvailableServices {
    availableServices {
      id
      serviceType
      nameRo
      nameEn
      descriptionRo
      descriptionEn
      basePricePerHour
      minHours
      icon
      includedItems
      categoryId
      pricingModel
      pricePerSqm
    }
  }
`;

export const AVAILABLE_EXTRAS = gql`
  query AvailableExtras {
    availableExtras {
      id
      nameRo
      nameEn
      price
      icon
      allowMultiple
      unitLabel
    }
  }
`;

export const ESTIMATE_PRICE = gql`
  query EstimatePrice($input: PriceEstimateInput!) {
    estimatePrice(input: $input) {
      hourlyRate
      estimatedHours
      propertyMultiplier
      petsSurcharge
      subtotal
      extras {
        extra {
          nameRo
          price
        }
        quantity
        lineTotal
      }
      total
      cityPricingMultiplier
      pricingModel
      areaTotal
    }
  }
`;

// ─── Client Bookings ────────────────────────────────────────────────────────

export const CREATE_BOOKING_REQUEST = gql`
  mutation CreateBookingRequest($input: CreateBookingInput!) {
    createBookingRequest(input: $input) {
      id
      referenceCode
      status
      estimatedTotal
      recurringGroupId
      subscriptionId
    }
  }
`;

export const MY_BOOKINGS = gql`
  query MyBookings($status: BookingStatus, $first: Int, $after: String) {
    myBookings(status: $status, first: $first, after: $after) {
      edges {
        id
        referenceCode
        serviceType
        serviceName
        scheduledDate
        scheduledStartTime
        estimatedTotal
        status
        recurringGroupId
        createdAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const CLIENT_BOOKING_DETAIL = gql`
  query ClientBookingDetail($id: ID!) {
    booking(id: $id) {
      id
      referenceCode
      serviceType
      serviceName
      categoryId
      category {
        id
        slug
        nameRo
        nameEn
        icon
      }
      includedItems
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      estimatedTotal
      finalTotal
      status
      specialInstructions
      propertyType
      numRooms
      numBathrooms
      areaSqm
      hasPets
      paymentStatus
      paidAt
      recurringGroupId
      subscriptionId
      occurrenceNumber
      rescheduleCount
      rescheduledAt
      createdAt
      startedAt
      completedAt
      address {
        streetAddress
        city
        county
        floor
        apartment
        entryCode
        notes
      }
      worker {
        id
        fullName
        user {
          id
          avatarUrl
        }
      }
      extras {
        extra {
          id
          nameRo
          nameEn
          price
          durationMinutes
          icon
          allowMultiple
          unitLabel
        }
        price
        quantity
      }
      review {
        id
        rating
        ratingPunctuality
        ratingQuality
        ratingCommunication
        ratingValue
        comment
        status
        photos {
          id
          photoUrl
          sortOrder
        }
        createdAt
      }
    }
  }
`;

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($id: ID!, $reason: String) {
    cancelBooking(id: $id, reason: $reason) {
      id
      referenceCode
      status
    }
  }
`;

export const BOOKING_POLICY = gql`
  query BookingPolicy {
    bookingPolicy {
      cancelFreeHoursBefore
      cancelLateRefundPct
      rescheduleFreeHoursBefore
      rescheduleMaxPerBooking
    }
  }
`;

export const CHECK_WORKER_AVAILABILITY = gql`
  query CheckWorkerAvailability($bookingId: ID!, $date: String!, $startTime: String!) {
    checkWorkerAvailability(bookingId: $bookingId, date: $date, startTime: $startTime) {
      available
      reason
      conflicts
    }
  }
`;

export const RESCHEDULE_BOOKING = gql`
  mutation RescheduleBooking(
    $id: ID!
    $scheduledDate: String!
    $scheduledStartTime: String!
    $reason: String
  ) {
    rescheduleBooking(
      id: $id
      scheduledDate: $scheduledDate
      scheduledStartTime: $scheduledStartTime
      reason: $reason
    ) {
      id
      referenceCode
      scheduledDate
      scheduledStartTime
      rescheduleCount
      rescheduledAt
      status
    }
  }
`;

export const PAY_FOR_BOOKING = gql`
  mutation PayForBooking($id: ID!) {
    payForBooking(id: $id) {
      id
      paymentStatus
      paidAt
    }
  }
`;

export const SUBMIT_REVIEW = gql`
  mutation SubmitReview($input: SubmitReviewInput!) {
    submitReview(input: $input) {
      id
      rating
      ratingPunctuality
      ratingQuality
      ratingCommunication
      ratingValue
      comment
      status
      photos {
        id
        photoUrl
        sortOrder
      }
      createdAt
    }
  }
`;

// ─── Recurring Bookings ─────────────────────────────────────────────────────

export const MY_RECURRING_GROUPS = gql`
  query MyRecurringGroups {
    myRecurringGroups {
      id
      recurrenceType
      dayOfWeek
      preferredTime
      serviceType
      serviceName
      hourlyRate
      estimatedTotalPerOccurrence
      isActive
      cancelledAt
      totalOccurrences
      completedOccurrences
      createdAt
      preferredWorker {
        id
        fullName
      }
      company {
        id
        companyName
      }
      upcomingOccurrences {
        id
        scheduledDate
        scheduledStartTime
        status
      }
    }
  }
`;

export const RECURRING_GROUP_DETAIL = gql`
  query RecurringGroupDetail($id: ID!) {
    recurringGroup(id: $id) {
      id
      recurrenceType
      dayOfWeek
      preferredTime
      serviceType
      serviceName
      hourlyRate
      estimatedTotalPerOccurrence
      isActive
      cancelledAt
      cancellationReason
      totalOccurrences
      completedOccurrences
      createdAt
      client {
        id
        fullName
        email
        phone
      }
      preferredWorker {
        id
        fullName
        phone
      }
      company {
        id
        companyName
        contactPhone
      }
      address {
        streetAddress
        city
        county
        floor
        apartment
      }
      occurrences {
        id
        referenceCode
        scheduledDate
        scheduledStartTime
        estimatedTotal
        status
        paymentStatus
        occurrenceNumber
        worker {
          id
          fullName
        }
      }
      upcomingOccurrences {
        id
        scheduledDate
        scheduledStartTime
        status
        occurrenceNumber
      }
    }
  }
`;

export const CANCEL_RECURRING_GROUP = gql`
  mutation CancelRecurringGroup($id: ID!, $reason: String) {
    cancelRecurringGroup(id: $id, reason: $reason) {
      id
      isActive
      cancelledAt
    }
  }
`;

export const PAUSE_RECURRING_GROUP = gql`
  mutation PauseRecurringGroup($id: ID!) {
    pauseRecurringGroup(id: $id) {
      id
      isActive
    }
  }
`;

export const RESUME_RECURRING_GROUP = gql`
  mutation ResumeRecurringGroup($id: ID!) {
    resumeRecurringGroup(id: $id) {
      id
      isActive
    }
  }
`;

// ─── Subscriptions ──────────────────────────────────────────────────────────

export const RECURRING_DISCOUNTS = gql`
  query RecurringDiscounts {
    recurringDiscounts {
      recurrenceType
      discountPct
      isActive
    }
  }
`;

export const SUBSCRIPTION_PRICING_PREVIEW = gql`
  query SubscriptionPricingPreview(
    $serviceType: ServiceType!
    $recurrenceType: RecurrenceType!
    $numRooms: Int!
    $numBathrooms: Int!
    $areaSqm: Int
    $propertyType: String
    $hasPets: Boolean
    $extras: [ExtraInput!]
  ) {
    subscriptionPricingPreview(
      serviceType: $serviceType
      recurrenceType: $recurrenceType
      numRooms: $numRooms
      numBathrooms: $numBathrooms
      areaSqm: $areaSqm
      propertyType: $propertyType
      hasPets: $hasPets
      extras: $extras
    ) {
      perSessionOriginal
      discountPct
      perSessionDiscounted
      sessionsPerMonth
      monthlyAmount
    }
  }
`;

export const CREATE_SUBSCRIPTION = gql`
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      id
      status
      recurrenceType
      serviceType
      serviceName
      monthlyAmount
      perSessionDiscounted
      sessionsPerMonth
      discountPct
      currentPeriodStart
      currentPeriodEnd
      createdAt
    }
  }
`;

export const SUGGEST_WORKER_FOR_SUBSCRIPTION = gql`
  query SuggestWorkerForSubscription(
    $cityId: ID!
    $areaId: ID!
    $recurrenceType: RecurrenceType!
    $dayOfWeek: Int!
    $preferredTimeStart: String!
    $preferredTimeEnd: String!
    $estimatedDurationHours: Float!
    $categoryId: ID
  ) {
    suggestWorkerForSubscription(
      cityId: $cityId
      areaId: $areaId
      recurrenceType: $recurrenceType
      dayOfWeek: $dayOfWeek
      preferredTimeStart: $preferredTimeStart
      preferredTimeEnd: $preferredTimeEnd
      estimatedDurationHours: $estimatedDurationHours
      categoryId: $categoryId
    ) {
      worker {
        id
        fullName
        ratingAvg
        totalJobsCompleted
        user {
          id
          avatarUrl
        }
      }
      company {
        id
        companyName
      }
      matchScore
      availableWeeks
      totalWeeks
      consistencyPct
      suggestedTimeStart
      suggestedTimeEnd
    }
  }
`;

export const REQUEST_SUBSCRIPTION_WORKER_CHANGE = gql`
  mutation RequestSubscriptionWorkerChange($id: ID!, $reason: String) {
    requestSubscriptionWorkerChange(id: $id, reason: $reason) {
      id
      status
      workerChangeRequestedAt
      workerChangeReason
      worker {
        id
        fullName
        ratingAvg
        user {
          id
          avatarUrl
        }
      }
    }
  }
`;

export const RESOLVE_SUBSCRIPTION_WORKER_CHANGE = gql`
  mutation ResolveSubscriptionWorkerChange($id: ID!, $workerId: ID!) {
    resolveSubscriptionWorkerChange(id: $id, workerId: $workerId) {
      id
      status
      workerChangeRequestedAt
      workerChangeReason
      worker {
        id
        fullName
        ratingAvg
        user {
          id
          avatarUrl
        }
      }
      company {
        id
        companyName
      }
    }
  }
`;

export const CHECK_WORKER_FOR_SUBSCRIPTION = gql`
  query CheckWorkerForSubscriptionBookings($subscriptionId: ID!, $workerId: ID!) {
    checkWorkerForSubscriptionBookings(subscriptionId: $subscriptionId, workerId: $workerId) {
      subscriptionId
      workerId
      workerName
      allAvailable
      availableCount
      conflictCount
      bookings {
        bookingId
        scheduledDate
        scheduledStartTime
        estimatedDurationHours
        referenceCode
        available
        reason
        conflicts
      }
    }
  }
`;

export const RESOLVE_WORKER_CHANGE_PER_BOOKING = gql`
  mutation ResolveSubscriptionWorkerChangePerBooking(
    $id: ID!
    $defaultWorkerId: ID!
    $assignments: [BookingWorkerAssignment!]!
  ) {
    resolveSubscriptionWorkerChangePerBooking(
      id: $id
      defaultWorkerId: $defaultWorkerId
      assignments: $assignments
    ) {
      id
      status
      workerChangeRequestedAt
      workerChangeReason
      worker {
        id
        fullName
        ratingAvg
        user {
          id
          avatarUrl
        }
      }
      company {
        id
        companyName
      }
    }
  }
`;

export const MY_SUBSCRIPTIONS = gql`
  query MySubscriptions {
    mySubscriptions {
      id
      recurrenceType
      serviceType
      serviceName
      status
      monthlyAmount
      perSessionDiscounted
      sessionsPerMonth
      discountPct
      currentPeriodStart
      currentPeriodEnd
      createdAt
      cancelledAt
      pausedAt
      totalBookings
      completedBookings
      worker {
        id
        fullName
      }
      company {
        id
        companyName
      }
      upcomingBookings {
        id
        scheduledDate
        scheduledStartTime
        status
      }
    }
  }
`;

export const SUBSCRIPTION_DETAIL = gql`
  query SubscriptionDetail($id: ID!) {
    serviceSubscription(id: $id) {
      id
      recurrenceType
      dayOfWeek
      preferredTime
      serviceType
      serviceName
      propertyType
      numRooms
      numBathrooms
      areaSqm
      hasPets
      specialInstructions
      hourlyRate
      estimatedDurationHours
      perSessionOriginal
      discountPct
      perSessionDiscounted
      sessionsPerMonth
      monthlyAmount
      platformCommissionPct
      stripeSubscriptionId
      status
      currentPeriodStart
      currentPeriodEnd
      cancelledAt
      cancellationReason
      pausedAt
      workerChangeRequestedAt
      workerChangeReason
      createdAt
      totalBookings
      completedBookings
      client {
        id
        fullName
        email
        phone
      }
      worker {
        id
        fullName
        ratingAvg
        user {
          avatarUrl
        }
      }
      company {
        id
        companyName
      }
      address {
        streetAddress
        city
        county
        floor
        apartment
      }
      bookings {
        id
        referenceCode
        scheduledDate
        scheduledStartTime
        estimatedTotal
        status
        paymentStatus
        worker {
          id
          fullName
        }
      }
      upcomingBookings {
        id
        referenceCode
        scheduledDate
        scheduledStartTime
        status
      }
      extras {
        extra {
          id
          nameRo
          nameEn
          price
        }
        quantity
        price
      }
    }
  }
`;

export const PAUSE_SUBSCRIPTION = gql`
  mutation PauseSubscription($id: ID!) {
    pauseSubscription(id: $id) {
      id
      status
      pausedAt
    }
  }
`;

export const RESUME_SUBSCRIPTION = gql`
  mutation ResumeSubscription($id: ID!) {
    resumeSubscription(id: $id) {
      id
      status
      pausedAt
    }
  }
`;

export const CANCEL_SUBSCRIPTION = gql`
  mutation CancelSubscription($id: ID!, $reason: String) {
    cancelSubscription(id: $id, reason: $reason) {
      id
      status
      cancelledAt
      cancellationReason
    }
  }
`;

export const COMPANY_SUBSCRIPTIONS = gql`
  query CompanySubscriptions($limit: Int, $offset: Int) {
    companySubscriptions(limit: $limit, offset: $offset) {
      edges {
        id
        recurrenceType
        serviceType
        serviceName
        status
        monthlyAmount
        perSessionDiscounted
        sessionsPerMonth
        currentPeriodStart
        currentPeriodEnd
        createdAt
        workerChangeRequestedAt
        client {
          id
          fullName
          email
        }
        worker {
          id
          fullName
        }
        totalBookings
        completedBookings
      }
      totalCount
    }
  }
`;

export const ALL_SUBSCRIPTIONS = gql`
  query AllSubscriptions($status: SubscriptionStatus, $limit: Int, $offset: Int) {
    allSubscriptions(status: $status, limit: $limit, offset: $offset) {
      edges {
        id
        recurrenceType
        serviceType
        serviceName
        status
        monthlyAmount
        perSessionDiscounted
        sessionsPerMonth
        currentPeriodStart
        currentPeriodEnd
        createdAt
        cancelledAt
        workerChangeRequestedAt
        workerChangeReason
        client {
          id
          fullName
          email
        }
        company {
          id
          companyName
        }
        worker {
          id
          fullName
        }
        totalBookings
        completedBookings
      }
      totalCount
    }
  }
`;

export const SUBSCRIPTION_STATS = gql`
  query SubscriptionStats {
    subscriptionStats {
      activeCount
      pausedCount
      pastDueCount
      cancelledCount
      monthlyRecurringRevenue
    }
  }
`;

export const ADMIN_CANCEL_SUBSCRIPTION = gql`
  mutation AdminCancelSubscription($id: ID!, $reason: String) {
    adminCancelSubscription(id: $id, reason: $reason) {
      id
      status
      cancelledAt
      cancellationReason
    }
  }
`;

export const UPDATE_RECURRING_DISCOUNT = gql`
  mutation UpdateRecurringDiscount($recurrenceType: RecurrenceType!, $discountPct: Float!) {
    updateRecurringDiscount(recurrenceType: $recurrenceType, discountPct: $discountPct) {
      recurrenceType
      discountPct
      isActive
    }
  }
`;

// ─── Client Addresses & Payment ─────────────────────────────────────────────

export const MY_ADDRESSES = gql`
  query MyAddresses {
    myAddresses {
      id
      label
      streetAddress
      city
      county
      postalCode
      floor
      apartment
      coordinates {
        latitude
        longitude
      }
      isDefault
    }
  }
`;

export const ADD_ADDRESS = gql`
  mutation AddAddress($input: AddAddressInput!) {
    addAddress(input: $input) {
      id
      label
      streetAddress
      city
      county
      postalCode
      floor
      apartment
      coordinates {
        latitude
        longitude
      }
      isDefault
    }
  }
`;

export const UPDATE_ADDRESS = gql`
  mutation UpdateAddress($id: ID!, $input: UpdateAddressInput!) {
    updateAddress(id: $id, input: $input) {
      id
      label
      streetAddress
      city
      county
      postalCode
      floor
      apartment
      coordinates {
        latitude
        longitude
      }
      isDefault
    }
  }
`;

export const DELETE_ADDRESS = gql`
  mutation DeleteAddress($id: ID!) {
    deleteAddress(id: $id)
  }
`;

export const SET_DEFAULT_ADDRESS = gql`
  mutation SetDefaultAddress($id: ID!) {
    setDefaultAddress(id: $id) {
      id
      isDefault
    }
  }
`;

export const MY_PAYMENT_METHODS = gql`
  query MyPaymentMethods {
    myPaymentMethods {
      id
      stripePaymentMethodId
      cardLastFour
      cardBrand
      cardExpMonth
      cardExpYear
      isDefault
    }
  }
`;

export const ALL_USERS = gql`
  query AllUsers {
    allUsers {
      id
      fullName
      email
      role
      status
      avatarUrl
    }
  }
`;

// ─── Company ────────────────────────────────────────────────────────────────

export const MY_COMPANY = gql`
  query MyCompany {
    myCompany {
      id
      companyName
      cui
      companyType
      legalRepresentative
      contactEmail
      contactPhone
      address
      city
      county
      description
      logoUrl
      status
      rejectionReason
      ratingAvg
      totalJobsCompleted
      serviceCategories {
        id
        slug
        nameRo
        nameEn
        icon
      }
      documents {
        id
        documentType
        fileName
        fileUrl
        status
        uploadedAt
        reviewedAt
        rejectionReason
      }
      createdAt
    }
  }
`;

export const APPLY_AS_COMPANY = gql`
  mutation ApplyAsCompany($input: CompanyApplicationInput!) {
    applyAsCompany(input: $input) {
      company {
        id
        companyName
        status
      }
      claimToken
    }
  }
`;

export const CLAIM_COMPANY = gql`
  mutation ClaimCompany($claimToken: String!) {
    claimCompany(claimToken: $claimToken) {
      id
      companyName
      status
    }
  }
`;

export const UPDATE_COMPANY_PROFILE = gql`
  mutation UpdateCompanyProfile($input: UpdateCompanyInput!) {
    updateCompanyProfile(input: $input) {
      id
      companyName
      description
      contactPhone
      contactEmail
    }
  }
`;

// ─── Workers ─────────────────────────────────────────────────────────────────

export const MY_WORKERS_LIST = gql`
  query MyWorkersList {
    myWorkers {
      id
      fullName
      phone
      email
      status
      isCompanyAdmin
      user {
        id
        avatarUrl
      }
      ratingAvg
      totalJobsCompleted
      serviceCategories {
        id
        slug
        nameRo
        nameEn
        icon
      }
      createdAt
    }
  }
`;

export const MY_WORKERS = gql`
  query MyWorkers {
    myWorkers {
      id
      userId
      fullName
      phone
      email
      bio
      user {
        id
        avatarUrl
      }
      status
      isCompanyAdmin
      inviteToken
      ratingAvg
      totalJobsCompleted
      serviceCategories {
        id
        slug
        nameRo
        nameEn
        icon
      }
      company {
        id
        companyName
      }
      availability {
        id
        dayOfWeek
        startTime
        endTime
        isAvailable
      }
      documents {
        id
        documentType
        fileName
        fileUrl
        status
        uploadedAt
        reviewedAt
        rejectionReason
      }
      personalityAssessment {
        id
        facetScores {
          facetCode
          facetName
          score
          maxScore
          isFlagged
        }
        integrityAvg
        workQualityAvg
        hasConcerns
        flaggedFacets
        completedAt
        insights {
          summary
          strengths
          concerns
          teamFitAnalysis
          recommendedAction
          confidence
          aiModel
          generatedAt
        }
      }
      createdAt
    }
  }
`;

export const INVITE_WORKER = gql`
  mutation InviteWorker($input: InviteWorkerInput!) {
    inviteWorker(input: $input) {
      id
      fullName
      email
      status
      inviteToken
    }
  }
`;

export const INVITE_SELF_AS_WORKER = gql`
  mutation InviteSelfAsWorker {
    inviteSelfAsWorker {
      id
      fullName
      status
      isCompanyAdmin
    }
  }
`;

export const UPDATE_WORKER_STATUS = gql`
  mutation UpdateWorkerStatus($id: ID!, $status: WorkerStatus!) {
    updateWorkerStatus(id: $id, status: $status) {
      id
      fullName
      status
    }
  }
`;

// ─── Company Bookings ────────────────────────────────────────────────────────

export const COMPANY_BOOKINGS = gql`
  query CompanyBookings($status: BookingStatus, $first: Int, $after: String) {
    companyBookings(status: $status, first: $first, after: $after) {
      edges {
        id
        referenceCode
        serviceType
        serviceName
        scheduledDate
        scheduledStartTime
        estimatedTotal
        status
        categoryId
        category {
          id
          slug
          nameRo
          nameEn
          icon
        }
        createdAt
        client {
          id
          fullName
          phone
        }
        worker {
          id
          fullName
        }
        address {
          streetAddress
          city
          county
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const COMPANY_BOOKING_DETAIL = gql`
  query CompanyBookingDetail($id: ID!) {
    booking(id: $id) {
      id
      referenceCode
      serviceType
      serviceName
      categoryId
      category {
        id
        slug
        nameRo
        nameEn
        icon
      }
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      estimatedTotal
      finalTotal
      hourlyRate
      platformCommissionPct
      propertyType
      status
      specialInstructions
      numRooms
      numBathrooms
      areaSqm
      hasPets
      paymentStatus
      paidAt
      createdAt
      startedAt
      completedAt
      cancelledAt
      cancellationReason
      recurringGroupId
      subscriptionId
      occurrenceNumber
      rescheduleCount
      rescheduledAt
      includedItems
      extras {
        extra {
          id
          nameRo
          nameEn
        }
        price
        quantity
      }
      review {
        rating
        comment
        createdAt
      }
      client {
        id
        fullName
        email
        phone
        avatarUrl
      }
      company {
        id
        companyName
      }
      address {
        streetAddress
        city
        county
        floor
        apartment
      }
      worker {
        id
        fullName
        phone
        email
        user {
          id
          avatarUrl
        }
      }
      timeSlots {
        id
        slotDate
        startTime
        endTime
        isSelected
      }
    }
  }
`;

export const COMPANY_INVOICE_FOR_BOOKING = gql`
  query CompanyInvoiceForBooking($bookingId: ID!) {
    companyInvoiceForBooking(bookingId: $bookingId) {
      id
      invoiceNumber
      status
      sellerCompanyName
      sellerCui
      sellerRegNumber
      sellerAddress
      sellerCity
      sellerCounty
      sellerIsVatPayer
      sellerBankName
      sellerIban
      buyerName
      buyerCui
      buyerAddress
      buyerCity
      buyerCounty
      buyerIsVatPayer
      subtotalAmount
      vatRate
      vatAmount
      totalAmount
      currency
      downloadUrl
      efacturaStatus
      issuedAt
      dueDate
      notes
      lineItems {
        id
        descriptionRo
        quantity
        unitPrice
        vatRate
        vatAmount
        lineTotal
        lineTotalWithVat
      }
    }
  }
`;

export const ASSIGN_WORKER = gql`
  mutation AssignWorker($bookingId: ID!, $workerId: ID!) {
    assignWorkerToBooking(bookingId: $bookingId, workerId: $workerId) {
      id
      status
      worker {
        id
        fullName
      }
    }
  }
`;

// ─── Admin Stats ─────────────────────────────────────────────────────────────

export const PLATFORM_STATS = gql`
  query PlatformStats {
    platformStats {
      totalClients
      totalCompanies
      totalWorkers
      totalBookings
      totalRevenue
      platformCommissionTotal
      averageRating
      bookingsThisMonth
      revenueThisMonth
      newClientsThisMonth
      newCompaniesThisMonth
      bookingsLastMonth
      revenueLastMonth
      newClientsLastMonth
      newCompaniesLastMonth
    }
  }
`;

export const BOOKINGS_BY_STATUS = gql`
  query BookingsByStatus {
    bookingsByStatus {
      status
      count
    }
  }
`;

export const REVENUE_BY_MONTH = gql`
  query RevenueByMonth($months: Int) {
    revenueByMonth(months: $months) {
      month
      revenue
      commission
      bookingCount
    }
  }
`;

export const COMPANY_PERFORMANCE = gql`
  query CompanyPerformance($first: Int) {
    companyPerformance(first: $first) {
      company {
        id
        companyName
        cui
        status
        ratingAvg
        totalJobsCompleted
        city
        county
      }
      totalBookings
      totalRevenue
      averageRating
      completionRate
    }
  }
`;

export const PENDING_COMPANY_APPLICATIONS = gql`
  query PendingCompanyApplications {
    pendingCompanyApplications {
      id
      companyName
      cui
      companyType
      legalRepresentative
      contactEmail
      contactPhone
      address
      city
      county
      description
      status
      serviceCategories {
        id
        slug
        nameRo
        nameEn
        icon
      }
      createdAt
      documents {
        id
        documentType
        status
      }
    }
  }
`;

// ─── Admin Companies ─────────────────────────────────────────────────────────

export const COMPANIES = gql`
  query Companies($status: CompanyStatus, $first: Int, $after: String) {
    companies(status: $status, first: $first, after: $after) {
      edges {
        id
        companyName
        cui
        companyType
        status
        ratingAvg
        totalJobsCompleted
        contactEmail
        contactPhone
        city
        county
        serviceCategories {
          id
          slug
          nameRo
          nameEn
          icon
        }
        createdAt
      }
      totalCount
    }
  }
`;

export const COMPANY = gql`
  query Company($id: ID!) {
    company(id: $id) {
      id
      companyName
      cui
      companyType
      legalRepresentative
      contactEmail
      contactPhone
      address
      city
      county
      description
      logoUrl
      status
      rejectionReason
      ratingAvg
      totalJobsCompleted
      commissionOverridePct
      serviceCategories {
        id
        slug
        nameRo
        nameEn
        icon
      }
      createdAt
      documents {
        id
        documentType
        fileUrl
        fileName
        status
        uploadedAt
        reviewedAt
        rejectionReason
      }
      anafVerification {
        status
        denumire
        adresa
        dataInfiintare
        scpTva
        inactive
        verifiedAt
        rawError
        nameMatchScore
        isActive
      }
      workers {
        id
        fullName
        email
        phone
        ratingAvg
        totalJobsCompleted
        user {
          id
          avatarUrl
        }
        status
        serviceCategories {
          id
          slug
          nameRo
          nameEn
          icon
        }
        documents {
          id
          documentType
          fileUrl
          fileName
          status
          uploadedAt
          reviewedAt
          rejectionReason
        }
        personalityAssessment {
          id
          facetScores {
            facetCode
            facetName
            score
            maxScore
            isFlagged
          }
          integrityAvg
          workQualityAvg
          hasConcerns
          flaggedFacets
          completedAt
          insights {
            summary
            strengths
            concerns
            teamFitAnalysis
            recommendedAction
            confidence
            aiModel
            generatedAt
          }
        }
      }
    }
  }
`;

// ─── Admin Bookings ──────────────────────────────────────────────────────────

export const ALL_BOOKINGS = gql`
  query AllBookings($status: BookingStatus, $companyId: ID, $first: Int, $after: String) {
    allBookings(status: $status, companyId: $companyId, first: $first, after: $after) {
      edges {
        id
        referenceCode
        serviceType
        serviceName
        scheduledDate
        scheduledStartTime
        estimatedDurationHours
        status
        estimatedTotal
        paymentStatus
        categoryId
        category {
          id
          slug
          nameRo
          nameEn
          icon
        }
        createdAt
        client {
          id
          fullName
          email
        }
        company {
          id
          companyName
        }
      }
      totalCount
    }
  }
`;

export const ADMIN_BOOKING_DETAIL = gql`
  query AdminBookingDetail($id: ID!) {
    booking(id: $id) {
      id
      referenceCode
      serviceType
      serviceName
      categoryId
      category {
        id
        slug
        nameRo
        nameEn
        icon
      }
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      propertyType
      numRooms
      numBathrooms
      areaSqm
      hasPets
      specialInstructions
      hourlyRate
      estimatedTotal
      finalTotal
      platformCommissionPct
      status
      paymentStatus
      paidAt
      recurringGroupId
      subscriptionId
      occurrenceNumber
      rescheduleCount
      rescheduledAt
      startedAt
      completedAt
      cancelledAt
      cancellationReason
      createdAt
      client {
        id
        fullName
        email
        phone
      }
      company {
        id
        companyName
        contactEmail
      }
      worker {
        id
        fullName
        phone
      }
      address {
        streetAddress
        city
        county
        postalCode
        floor
        apartment
      }
      timeSlots {
        id
        slotDate
        startTime
        endTime
        isSelected
      }
    }
  }
`;

export const SELECT_BOOKING_TIME_SLOT = gql`
  mutation SelectBookingTimeSlot($bookingId: ID!, $timeSlotId: ID!) {
    selectBookingTimeSlot(bookingId: $bookingId, timeSlotId: $timeSlotId) {
      id
      scheduledDate
      scheduledStartTime
      status
      timeSlots {
        id
        slotDate
        startTime
        endTime
        isSelected
      }
    }
  }
`;

export const ALL_WORKERS = gql`
  query AllWorkers {
    allWorkers {
      id
      fullName
      email
      phone
      status
      ratingAvg
      totalJobsCompleted
      serviceCategories {
        id
        slug
        nameRo
        nameEn
        icon
      }
      company {
        id
        companyName
      }
    }
  }
`;

// ─── Admin Mutations ─────────────────────────────────────────────────────────

export const APPROVE_COMPANY = gql`
  mutation ApproveCompany($id: ID!) {
    approveCompany(id: $id) {
      id
      status
    }
  }
`;

export const REJECT_COMPANY = gql`
  mutation RejectCompany($id: ID!, $reason: String!) {
    rejectCompany(id: $id, reason: $reason) {
      id
      status
      rejectionReason
    }
  }
`;

export const SUSPEND_COMPANY = gql`
  mutation SuspendCompany($id: ID!, $reason: String!) {
    suspendCompany(id: $id, reason: $reason) {
      id
      status
    }
  }
`;

export const VERIFY_COMPANY_WITH_ANAF = gql`
  mutation VerifyCompanyWithANAF($id: ID!) {
    verifyCompanyWithANAF(id: $id) {
      id
      anafVerification {
        status
        denumire
        adresa
        dataInfiintare
        scpTva
        inactive
        verifiedAt
        rawError
        nameMatchScore
        isActive
      }
    }
  }
`;

export const ADMIN_CANCEL_BOOKING = gql`
  mutation AdminCancelBooking($id: ID!, $reason: String!) {
    adminCancelBooking(id: $id, reason: $reason) {
      id
      status
    }
  }
`;

export const ADMIN_RESCHEDULE_BOOKING = gql`
  mutation AdminRescheduleBooking(
    $id: ID!
    $scheduledDate: String!
    $scheduledStartTime: String!
    $reason: String
  ) {
    adminRescheduleBooking(
      id: $id
      scheduledDate: $scheduledDate
      scheduledStartTime: $scheduledStartTime
      reason: $reason
    ) {
      id
      referenceCode
      scheduledDate
      scheduledStartTime
      rescheduleCount
      rescheduledAt
      status
    }
  }
`;

export const SUSPEND_USER = gql`
  mutation SuspendUser($id: ID!, $reason: String!) {
    suspendUser(id: $id, reason: $reason) {
      id
      status
    }
  }
`;

export const REACTIVATE_USER = gql`
  mutation ReactivateUser($id: ID!) {
    reactivateUser(id: $id) {
      id
      status
    }
  }
`;

// ─── Admin CMS: Platform Settings ───────────────────────────────────────────

export const PLATFORM_SETTINGS = gql`
  query PlatformSettings {
    platformSettings {
      key
      value
      valueType
      description
      updatedAt
    }
  }
`;

export const UPDATE_PLATFORM_SETTING = gql`
  mutation UpdatePlatformSetting($key: String!, $value: String!) {
    updatePlatformSetting(key: $key, value: $value) {
      key
      value
      valueType
      description
      updatedAt
    }
  }
`;

// ─── Admin CMS: Service Management ──────────────────────────────────────────

export const ALL_SERVICES = gql`
  query AllServices {
    allServices {
      id
      serviceType
      nameRo
      nameEn
      basePricePerHour
      minHours
      hoursPerRoom
      hoursPerBathroom
      hoursPer100Sqm
      houseMultiplier
      petDurationMinutes
      icon
      isActive
      includedItems
      categoryId
      pricingModel
      pricePerSqm
    }
  }
`;

export const ALL_EXTRAS = gql`
  query AllExtras {
    allExtras {
      id
      nameRo
      nameEn
      price
      durationMinutes
      icon
      isActive
      allowMultiple
      unitLabel
      categoryId
    }
  }
`;

export const UPDATE_SERVICE_DEFINITION = gql`
  mutation UpdateServiceDefinition($input: UpdateServiceDefinitionInput!) {
    updateServiceDefinition(input: $input) {
      id
      nameRo
      nameEn
      basePricePerHour
      minHours
      hoursPerRoom
      hoursPerBathroom
      hoursPer100Sqm
      houseMultiplier
      petDurationMinutes
      isActive
      includedItems
      categoryId
      pricingModel
      pricePerSqm
    }
  }
`;

export const CREATE_SERVICE_DEFINITION = gql`
  mutation CreateServiceDefinition($input: CreateServiceDefinitionInput!) {
    createServiceDefinition(input: $input) {
      id
      serviceType
      nameRo
      nameEn
      basePricePerHour
      minHours
      hoursPerRoom
      hoursPerBathroom
      hoursPer100Sqm
      houseMultiplier
      petDurationMinutes
      isActive
      includedItems
      categoryId
      pricingModel
      pricePerSqm
    }
  }
`;

export const UPDATE_SERVICE_EXTRA = gql`
  mutation UpdateServiceExtra($input: UpdateServiceExtraInput!) {
    updateServiceExtra(input: $input) {
      id
      nameRo
      nameEn
      price
      durationMinutes
      isActive
      allowMultiple
      unitLabel
      categoryId
    }
  }
`;

export const CREATE_SERVICE_EXTRA = gql`
  mutation CreateServiceExtra($input: CreateServiceExtraInput!) {
    createServiceExtra(input: $input) {
      id
      nameRo
      nameEn
      price
      durationMinutes
      isActive
      allowMultiple
      unitLabel
      categoryId
    }
  }
`;

export const AVAILABLE_EXTRAS_BY_CATEGORY = gql`
  query AvailableExtrasByCategory($categoryId: ID!) {
    availableExtrasByCategory(categoryId: $categoryId) {
      id
      nameRo
      nameEn
      price
      durationMinutes
      icon
      isActive
      allowMultiple
      unitLabel
      categoryId
    }
  }
`;

// ─── Admin CMS: User Management ─────────────────────────────────────────────

export const SEARCH_USERS = gql`
  query SearchUsers($query: String, $role: UserRole, $status: UserStatus, $limit: Int, $offset: Int) {
    searchUsers(query: $query, role: $role, status: $status, limit: $limit, offset: $offset) {
      users {
        id
        fullName
        email
        phone
        avatarUrl
        role
        status
        createdAt
      }
      totalCount
    }
  }
`;

export const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      fullName
      email
      phone
      avatarUrl
      role
      status
      preferredLanguage
      createdAt
    }
  }
`;

export const GET_USER_WITH_WORKER = gql`
  query GetUserWithWorker($id: ID!) {
    user(id: $id) {
      id
      fullName
      email
      phone
      avatarUrl
      role
      status
      preferredLanguage
      createdAt

      # Worker data (null if not WORKER role)
      workerProfile {
        id
        userId
        fullName
        phone
        email
        bio
        status
        isCompanyAdmin
        ratingAvg
        totalJobsCompleted
        serviceCategories {
          id
          slug
          nameRo
          nameEn
          icon
        }
        company {
          id
          companyName
        }
        documents {
          id
          documentType
          fileName
          fileUrl
          status
          uploadedAt
          reviewedAt
          rejectionReason
        }
        personalityAssessment {
          id
          facetScores {
            facetCode
            facetName
            score
            maxScore
            isFlagged
          }
          integrityAvg
          workQualityAvg
          hasConcerns
          flaggedFacets
          completedAt
          insights {
            summary
            strengths
            concerns
            teamFitAnalysis
            recommendedAction
            confidence
            aiModel
            generatedAt
          }
        }
      }
    }
  }
`;

export const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($userId: ID!, $role: UserRole!) {
    updateUserRole(userId: $userId, role: $role) {
      id
      role
    }
  }
`;

export const ADMIN_UPDATE_USER_PROFILE = gql`
  mutation AdminUpdateUserProfile($userId: ID!, $fullName: String!, $phone: String) {
    adminUpdateUserProfile(userId: $userId, fullName: $fullName, phone: $phone) {
      id
      fullName
      phone
    }
  }
`;

// ─── Admin CMS: Company Management ──────────────────────────────────────────

export const SEARCH_COMPANIES = gql`
  query SearchCompanies($query: String, $status: CompanyStatus, $limit: Int, $offset: Int) {
    searchCompanies(query: $query, status: $status, limit: $limit, offset: $offset) {
      edges {
        id
        companyName
        cui
        companyType
        status
        ratingAvg
        totalJobsCompleted
        contactEmail
        contactPhone
        city
        county
        serviceCategories {
          id
          slug
          nameRo
          nameEn
          icon
        }
        createdAt
      }
      totalCount
    }
  }
`;

export const COMPANY_FINANCIAL_SUMMARY = gql`
  query CompanyFinancialSummary($companyId: ID!) {
    companyFinancialSummary(companyId: $companyId) {
      completedBookings
      totalRevenue
      totalCommission
      netPayout
    }
  }
`;

export const ADMIN_UPDATE_COMPANY_PROFILE = gql`
  mutation AdminUpdateCompanyProfile($input: AdminUpdateCompanyInput!) {
    adminUpdateCompanyProfile(input: $input) {
      id
      companyName
      cui
      address
      contactPhone
      contactEmail
    }
  }
`;

export const ADMIN_UPDATE_COMPANY_STATUS = gql`
  mutation AdminUpdateCompanyStatus($id: ID!, $status: CompanyStatus!) {
    adminUpdateCompanyStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const SET_COMPANY_COMMISSION_OVERRIDE = gql`
  mutation SetCompanyCommissionOverride($id: ID!, $pct: Float) {
    setCompanyCommissionOverride(id: $id, pct: $pct) {
      id
      commissionOverridePct
    }
  }
`;

// ─── Admin CMS: Analytics ───────────────────────────────────────────────────

export const REVENUE_BY_DATE_RANGE = gql`
  query RevenueByDateRange($from: String!, $to: String!) {
    revenueByDateRange(from: $from, to: $to) {
      date
      bookingCount
      revenue
      commission
    }
  }
`;

export const REVENUE_BY_SERVICE_TYPE = gql`
  query RevenueByServiceType($from: String!, $to: String!) {
    revenueByServiceType(from: $from, to: $to) {
      serviceType
      bookingCount
      revenue
    }
  }
`;

export const TOP_COMPANIES_BY_REVENUE = gql`
  query TopCompaniesByRevenue($from: String!, $to: String!, $limit: Int) {
    topCompaniesByRevenue(from: $from, to: $to, limit: $limit) {
      id
      companyName
      bookingCount
      revenue
      commission
    }
  }
`;

export const PLATFORM_TOTALS = gql`
  query PlatformTotals {
    platformTotals {
      totalCompleted
      totalBookings
      totalRevenue
      totalCommission
      uniqueClients
      activeCompanies
    }
  }
`;

export const BOOKING_DEMAND_HEATMAP = gql`
  query BookingDemandHeatmap($from: String!, $to: String!) {
    bookingDemandHeatmap(from: $from, to: $to) {
      dayOfWeek
      hour
      count
    }
  }
`;

export const COMPANY_SCORECARDS = gql`
  query CompanyScorecards($limit: Int, $offset: Int) {
    companyScorecards(limit: $limit, offset: $offset) {
      id
      companyName
      status
      completedCount
      cancelledCount
      totalBookings
      totalRevenue
      completionRate
      cancellationRate
      avgRating
      reviewCount
    }
  }
`;

// ─── Admin CMS: Bookings Search ─────────────────────────────────────────────

export const SEARCH_BOOKINGS = gql`
  query SearchBookings($query: String, $status: BookingStatus, $dateFrom: String, $dateTo: String, $companyId: ID, $serviceType: String, $limit: Int, $offset: Int) {
    searchBookings(query: $query, status: $status, dateFrom: $dateFrom, dateTo: $dateTo, companyId: $companyId, serviceType: $serviceType, limit: $limit, offset: $offset) {
      edges {
        id
        referenceCode
        serviceType
        serviceName
        scheduledDate
        scheduledStartTime
        estimatedTotal
        status
        paymentStatus
        categoryId
        category {
          id
          slug
          nameRo
          nameEn
          icon
        }
        recurringGroupId
        subscriptionId
        occurrenceNumber
        createdAt
        client {
          id
          fullName
          email
        }
        company {
          id
          companyName
        }
      }
      totalCount
      pageInfo {
        hasNextPage
      }
    }
  }
`;

// ─── Admin CMS: Review Moderation ───────────────────────────────────────────

export const ALL_REVIEWS = gql`
  query AllReviews($limit: Int, $offset: Int, $rating: Int, $reviewType: String) {
    allReviews(limit: $limit, offset: $offset, rating: $rating, reviewType: $reviewType) {
      reviews {
        id
        rating
        ratingPunctuality
        ratingQuality
        ratingCommunication
        ratingValue
        comment
        reviewType
        status
        photos {
          id
          photoUrl
          sortOrder
        }
        createdAt
        booking {
          id
          referenceCode
        }
        reviewer {
          id
          fullName
        }
      }
      totalCount
    }
  }
`;

export const DELETE_REVIEW = gql`
  mutation DeleteReview($id: ID!) {
    deleteReview(id: $id)
  }
`;

export const APPROVE_REVIEW = gql`
  mutation ApproveReview($id: ID!) {
    approveReview(id: $id) {
      id
      status
    }
  }
`;

export const REJECT_REVIEW = gql`
  mutation RejectReview($id: ID!) {
    rejectReview(id: $id) {
      id
      status
    }
  }
`;

export const UPLOAD_REVIEW_PHOTOS = gql`
  mutation UploadReviewPhotos($reviewId: ID!, $files: [Upload!]!) {
    uploadReviewPhotos(reviewId: $reviewId, files: $files) {
      id
      photoUrl
      sortOrder
    }
  }
`;

// ─── Company: Worker Reviews ────────────────────────────────────────────────

export const COMPANY_WORKER_REVIEWS = gql`
  query CompanyWorkerReviews($limit: Int, $offset: Int, $rating: Int) {
    companyWorkerReviews(limit: $limit, offset: $offset, rating: $rating) {
      reviews {
        id
        rating
        ratingPunctuality
        ratingQuality
        ratingCommunication
        ratingValue
        comment
        reviewType
        status
        photos {
          id
          photoUrl
          sortOrder
        }
        createdAt
        booking {
          id
          referenceCode
        }
        reviewer {
          id
          fullName
        }
        worker {
          id
          fullName
        }
      }
      totalCount
    }
  }
`;

// ─── Company CMS ────────────────────────────────────────────────────────────

export const MY_COMPANY_FINANCIAL_SUMMARY = gql`
  query MyCompanyFinancialSummary {
    myCompanyFinancialSummary {
      completedBookings
      totalRevenue
      totalCommission
      netPayout
    }
  }
`;

export const COMPANY_REVENUE_BY_DATE_RANGE = gql`
  query CompanyRevenueByDateRange($from: String!, $to: String!) {
    companyRevenueByDateRange(from: $from, to: $to) {
      date
      bookingCount
      revenue
      commission
    }
  }
`;

export const COMPANY_BOOKINGS_BY_DATE_RANGE = gql`
  query CompanyBookingsByDateRange($from: String!, $to: String!) {
    companyBookingsByDateRange(from: $from, to: $to) {
      id
      referenceCode
      serviceType
      serviceName
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      status
      estimatedTotal
      categoryId
      category {
        id
        slug
        nameRo
        nameEn
        icon
      }
      client {
        id
        fullName
        phone
      }
      worker {
        id
        fullName
      }
      address {
        streetAddress
        city
      }
    }
  }
`;

export const SEARCH_COMPANY_BOOKINGS = gql`
  query SearchCompanyBookings($query: String, $status: String, $dateFrom: String, $dateTo: String, $limit: Int, $offset: Int) {
    searchCompanyBookings(query: $query, status: $status, dateFrom: $dateFrom, dateTo: $dateTo, limit: $limit, offset: $offset) {
      edges {
        id
        referenceCode
        scheduledDate
        estimatedTotal
        status
        categoryId
        category {
          id
          slug
          nameRo
          nameEn
          icon
        }
        recurringGroupId
      subscriptionId
      }
      totalCount
    }
  }
`;

export const WORKER_PERFORMANCE = gql`
  query WorkerPerformance($workerId: ID!) {
    workerPerformance(workerId: $workerId) {
      workerId
      fullName
      ratingAvg
      totalCompletedJobs
      thisMonthCompleted
      totalEarnings
      thisMonthEarnings
    }
  }
`;

export const MY_COMPANY_WORK_SCHEDULE = gql`
  query MyCompanyWorkSchedule {
    myCompanyWorkSchedule {
      id
      dayOfWeek
      startTime
      endTime
      isWorkDay
    }
  }
`;

export const UPDATE_WORKER_AVAILABILITY = gql`
  mutation UpdateWorkerAvailability($workerId: ID!, $slots: [AvailabilitySlotInput!]!) {
    updateWorkerAvailability(workerId: $workerId, slots: $slots) {
      id
      dayOfWeek
      startTime
      endTime
      isAvailable
    }
  }
`;

export const WORKER_DATE_OVERRIDES = gql`
  query WorkerDateOverrides($workerId: ID!, $from: String!, $to: String!) {
    workerDateOverrides(workerId: $workerId, from: $from, to: $to) {
      id
      date
      isAvailable
      startTime
      endTime
    }
  }
`;

export const SET_WORKER_DATE_OVERRIDE_BY_ADMIN = gql`
  mutation SetWorkerDateOverrideByAdmin($workerId: ID!, $date: String!, $isAvailable: Boolean!, $startTime: String!, $endTime: String!) {
    setWorkerDateOverrideByAdmin(workerId: $workerId, date: $date, isAvailable: $isAvailable, startTime: $startTime, endTime: $endTime) {
      id
      date
      isAvailable
      startTime
      endTime
    }
  }
`;

// ─── Worker ──────────────────────────────────────────────────────────────────

export const TODAYS_JOBS = gql`
  query TodaysJobs {
    todaysJobs {
      id
      referenceCode
      serviceType
      serviceName
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      status
      categoryId
      category {
        id
        slug
        nameRo
        nameEn
        icon
      }
      address {
        streetAddress
        city
        floor
        apartment
      }
      client {
        fullName
        phone
      }
    }
  }
`;

export const MY_ASSIGNED_JOBS = gql`
  query MyAssignedJobs($status: BookingStatus) {
    myAssignedJobs(status: $status) {
      id
      referenceCode
      serviceType
      serviceName
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      status
      categoryId
      category {
        id
        slug
        nameRo
        nameEn
        icon
      }
      address {
        streetAddress
        city
      }
      client {
        fullName
      }
    }
  }
`;

export const MY_WORKER_PROFILE = gql`
  query MyWorkerProfile {
    myWorkerProfile {
      id
      userId
      fullName
      phone
      email
      bio
      user {
        id
        avatarUrl
      }
      status
      ratingAvg
      totalJobsCompleted
      serviceCategories {
        id
        slug
        nameRo
        nameEn
        icon
      }
      company {
        id
        companyName
      }
      documents {
        id
        documentType
        fileUrl
        fileName
        status
        uploadedAt
        rejectionReason
      }
      personalityAssessment {
        id
        completedAt
      }
      createdAt
    }
  }
`;

export const MY_WORKER_STATS = gql`
  query MyWorkerStats {
    myWorkerStats {
      totalJobsCompleted
      thisMonthJobs
      averageRating
      totalReviews
      thisMonthEarnings
    }
  }
`;

export const ACCEPT_INVITATION = gql`
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token) {
      id
      fullName
      status
      company {
        id
        companyName
      }
    }
  }
`;

export const UPDATE_AVAILABILITY = gql`
  mutation UpdateAvailability($slots: [AvailabilitySlotInput!]!) {
    updateAvailability(slots: $slots) {
      id
      dayOfWeek
      startTime
      endTime
      isAvailable
    }
  }
`;

export const CONFIRM_BOOKING = gql`
  mutation ConfirmBooking($id: ID!) {
    confirmBooking(id: $id) {
      id
      status
    }
  }
`;

export const START_JOB = gql`
  mutation StartJob($id: ID!) {
    startJob(id: $id) {
      id
      status
      startedAt
    }
  }
`;

export const COMPLETE_JOB = gql`
  mutation CompleteJob($id: ID!) {
    completeJob(id: $id) {
      id
      status
      completedAt
    }
  }
`;

// ─── Worker Dashboard Operations ────────────────────────────────────────────

export const WORKER_EARNINGS_BY_DATE_RANGE = gql`
  query WorkerEarningsByDateRange($from: String!, $to: String!) {
    workerEarningsByDateRange(from: $from, to: $to) {
      date
      amount
    }
  }
`;

export const SEARCH_WORKER_BOOKINGS = gql`
  query SearchWorkerBookings($query: String, $status: String, $dateFrom: String, $dateTo: String, $limit: Int, $offset: Int) {
    searchWorkerBookings(query: $query, status: $status, dateFrom: $dateFrom, dateTo: $dateTo, limit: $limit, offset: $offset) {
      edges {
        id
        referenceCode
        serviceType
        serviceName
        scheduledDate
        scheduledStartTime
        estimatedDurationHours
        hourlyRate
        estimatedTotal
        status
        categoryId
        category {
          id
          slug
          nameRo
          nameEn
          icon
        }
        recurringGroupId
      subscriptionId
        occurrenceNumber
        createdAt
        client {
          id
          fullName
          phone
        }
        address {
          streetAddress
          city
          county
        }
      }
      pageInfo {
        hasNextPage
      }
      totalCount
    }
  }
`;

export const MY_WORKER_AVAILABILITY = gql`
  query MyWorkerAvailability {
    myWorkerAvailability {
      id
      dayOfWeek
      startTime
      endTime
      isAvailable
    }
  }
`;

export const MY_WORKER_BOOKINGS_BY_DATE_RANGE = gql`
  query MyWorkerBookingsByDateRange($from: String!, $to: String!) {
    myWorkerBookingsByDateRange(from: $from, to: $to) {
      id
      referenceCode
      serviceType
      serviceName
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      status
      categoryId
      category {
        id
        slug
        nameRo
        nameEn
        icon
      }
      client {
        fullName
        phone
      }
      address {
        streetAddress
        city
      }
    }
  }
`;

export const MY_WORKER_REVIEWS = gql`
  query MyWorkerReviews($limit: Int, $offset: Int) {
    myWorkerReviews(limit: $limit, offset: $offset) {
      reviews {
        id
        rating
        ratingPunctuality
        ratingQuality
        ratingCommunication
        ratingValue
        comment
        reviewType
        status
        photos {
          id
          photoUrl
          sortOrder
        }
        createdAt
        booking {
          id
          referenceCode
        }
        reviewer {
          id
          fullName
        }
      }
      totalCount
    }
  }
`;

export const MY_WORKER_COMPANY_SCHEDULE = gql`
  query MyWorkerCompanySchedule {
    myWorkerCompanySchedule {
      id
      dayOfWeek
      startTime
      endTime
      isWorkDay
    }
  }
`;

export const MY_WORKER_DATE_OVERRIDES = gql`
  query MyWorkerDateOverrides($from: String!, $to: String!) {
    myWorkerDateOverrides(from: $from, to: $to) {
      id
      date
      isAvailable
      startTime
      endTime
    }
  }
`;

export const SET_WORKER_DATE_OVERRIDE = gql`
  mutation SetWorkerDateOverride($date: String!, $isAvailable: Boolean!, $startTime: String!, $endTime: String!) {
    setWorkerDateOverride(date: $date, isAvailable: $isAvailable, startTime: $startTime, endTime: $endTime) {
      id
      date
      isAvailable
      startTime
      endTime
    }
  }
`;

export const UPDATE_WORKER_PROFILE = gql`
  mutation UpdateWorkerProfile($input: UpdateWorkerProfileInput!) {
    updateWorkerProfile(input: $input) {
      id
      fullName
      phone
      email
      bio
      user {
        id
        avatarUrl
      }
      status
      ratingAvg
      totalJobsCompleted
      company {
        id
        companyName
      }
    }
  }
`;

// ─── Cities, Areas & Location ──────────────────────────────────────────────

export const ACTIVE_CITIES = gql`
  query ActiveCities {
    activeCities {
      id
      name
      county
      isActive
      areas {
        id
        name
        cityId
        cityName
      }
    }
  }
`;

export const ALL_CITIES = gql`
  query AllCities {
    allCities {
      id
      name
      county
      isActive
      pricingMultiplier
      areas {
        id
        name
        cityId
        cityName
      }
    }
  }
`;

export const CITY_AREAS = gql`
  query CityAreas($cityId: ID!) {
    cityAreas(cityId: $cityId) {
      id
      name
      cityId
      cityName
    }
  }
`;

export const CREATE_CITY = gql`
  mutation CreateCity($name: String!, $county: String!) {
    createCity(name: $name, county: $county) {
      id
      name
      county
      isActive
      areas {
        id
        name
        cityId
        cityName
      }
    }
  }
`;

export const TOGGLE_CITY_ACTIVE = gql`
  mutation ToggleCityActive($id: ID!, $isActive: Boolean!) {
    toggleCityActive(id: $id, isActive: $isActive) {
      id
      name
      county
      isActive
    }
  }
`;

export const CREATE_CITY_AREA = gql`
  mutation CreateCityArea($cityId: ID!, $name: String!) {
    createCityArea(cityId: $cityId, name: $name) {
      id
      name
      cityId
      cityName
    }
  }
`;

export const DELETE_CITY_AREA = gql`
  mutation DeleteCityArea($id: ID!) {
    deleteCityArea(id: $id)
  }
`;

export const IS_CITY_SUPPORTED = gql`
  query IsCitySupported($city: String!) {
    isCitySupported(city: $city)
  }
`;

export const SUGGEST_WORKERS = gql`
  query SuggestWorkers($cityId: ID!, $areaId: ID!, $timeSlots: [TimeSlotInput!]!, $estimatedDurationHours: Float!, $categoryId: ID) {
    suggestWorkers(cityId: $cityId, areaId: $areaId, timeSlots: $timeSlots, estimatedDurationHours: $estimatedDurationHours, categoryId: $categoryId) {
      worker {
        id
        fullName
        user {
          id
          avatarUrl
        }
        ratingAvg
        totalJobsCompleted
      }
      company {
        id
        companyName
      }
      availabilityStatus
      availableFrom
      availableTo
      suggestedStartTime
      suggestedEndTime
      suggestedSlotIndex
      suggestedDate
      matchScore
    }
  }
`;

export const MY_COMPANY_SERVICE_AREAS = gql`
  query MyCompanyServiceAreas {
    myCompanyServiceAreas {
      id
      name
      cityId
      cityName
    }
  }
`;

export const UPDATE_COMPANY_SERVICE_AREAS = gql`
  mutation UpdateCompanyServiceAreas($areaIds: [ID!]!) {
    updateCompanyServiceAreas(areaIds: $areaIds) {
      id
      name
      cityId
      cityName
    }
  }
`;

export const WORKER_SERVICE_AREAS = gql`
  query WorkerServiceAreas($workerId: ID!) {
    workerServiceAreas(workerId: $workerId) {
      id
      name
      cityId
      cityName
    }
  }
`;

export const MY_WORKER_SERVICE_AREAS = gql`
  query MyWorkerServiceAreas {
    myWorkerServiceAreas {
      id
      name
      cityId
      cityName
    }
  }
`;

export const UPDATE_WORKER_SERVICE_AREAS = gql`
  mutation UpdateWorkerServiceAreas($workerId: ID!, $areaIds: [ID!]!) {
    updateWorkerServiceAreas(workerId: $workerId, areaIds: $areaIds) {
      id
      name
      cityId
      cityName
    }
  }
`;

// ─── Payment Methods ──────────────────────────────────────────────────────

export const CREATE_SETUP_INTENT = gql`
  mutation CreateSetupIntent {
    createSetupIntent {
      clientSecret
    }
  }
`;

export const ATTACH_PAYMENT_METHOD = gql`
  mutation AttachPaymentMethod($stripePaymentMethodId: String!) {
    attachPaymentMethod(stripePaymentMethodId: $stripePaymentMethodId) {
      id
      cardLastFour
      cardBrand
      cardExpMonth
      cardExpYear
      isDefault
    }
  }
`;

export const DELETE_PAYMENT_METHOD = gql`
  mutation DeletePaymentMethod($id: ID!) {
    deletePaymentMethod(id: $id)
  }
`;

export const SET_DEFAULT_PAYMENT_METHOD = gql`
  mutation SetDefaultPaymentMethod($id: ID!) {
    setDefaultPaymentMethod(id: $id) {
      id
      isDefault
    }
  }
`;

// ─── Stripe Payments ──────────────────────────────────────────────────────

export const CREATE_BOOKING_PAYMENT_INTENT = gql`
  mutation CreateBookingPaymentIntent($bookingId: ID!) {
    createBookingPaymentIntent(bookingId: $bookingId) {
      clientSecret
      paymentIntentId
      amount
      currency
    }
  }
`;

export const REQUEST_REFUND = gql`
  mutation RequestRefund($bookingId: ID!, $reason: String!) {
    requestRefund(bookingId: $bookingId, reason: $reason) {
      id
      amount
      reason
      status
      createdAt
    }
  }
`;

export const MY_REFUND_REQUESTS = gql`
  query MyRefundRequests {
    myRefundRequests {
      id
      amount
      reason
      status
      processedAt
      createdAt
      booking {
        id
        referenceCode
        serviceName
      }
    }
  }
`;

export const MY_PAYMENT_HISTORY = gql`
  query MyPaymentHistory($limit: Int, $offset: Int) {
    myPaymentHistory(limit: $limit, offset: $offset) {
      edges {
        id
        amount
        currency
        status
        createdAt
        paidAt
        booking {
          id
          referenceCode
          serviceName
        }
      }
      pageInfo {
        hasNextPage
      }
      totalCount
    }
  }
`;

export const BOOKING_PAYMENT_DETAILS = gql`
  query BookingPaymentDetails($bookingId: ID!) {
    bookingPaymentDetails(bookingId: $bookingId) {
      id
      bookingId
      stripePaymentIntentId
      amountTotal
      amountCompany
      amountPlatformFee
      currency
      status
      failureReason
      refundAmount
      createdAt
    }
  }
`;

// ─── Stripe Connect (Company) ─────────────────────────────────────────────

export const MY_CONNECT_STATUS = gql`
  query MyConnectStatus {
    myConnectStatus {
      accountId
      onboardingStatus
      chargesEnabled
      payoutsEnabled
    }
  }
`;

export const INITIATE_CONNECT_ONBOARDING = gql`
  mutation InitiateConnectOnboarding {
    initiateConnectOnboarding {
      url
    }
  }
`;

export const REFRESH_CONNECT_ONBOARDING = gql`
  mutation RefreshConnectOnboarding {
    refreshConnectOnboarding {
      url
    }
  }
`;

export const MY_PAYOUTS = gql`
  query MyPayouts($first: Int, $after: String) {
    myPayouts(first: $first, after: $after) {
      id
      amount
      currency
      periodFrom
      periodTo
      bookingCount
      status
      paidAt
      createdAt
      company {
        id
        companyName
      }
    }
  }
`;

export const MY_PAYOUT_DETAIL = gql`
  query MyPayoutDetail($id: ID!) {
    myPayoutDetail(id: $id) {
      id
      amount
      currency
      periodFrom
      periodTo
      bookingCount
      status
      paidAt
      createdAt
      company {
        id
        companyName
      }
      lineItems {
        id
        amountGross
        amountCommission
        amountNet
        booking {
          id
          referenceCode
          serviceName
          scheduledDate
        }
      }
    }
  }
`;

export const MY_COMPANY_EARNINGS = gql`
  query MyCompanyEarnings($from: String!, $to: String!) {
    myCompanyEarnings(from: $from, to: $to) {
      totalGross
      totalCommission
      totalNet
      bookingCount
      averagePerBooking
    }
  }
`;

// ─── Billing & Invoices (Client) ──────────────────────────────────────────

export const MY_BILLING_PROFILE = gql`
  query MyBillingProfile {
    myBillingProfile {
      id
      isCompany
      companyName
      cui
      regNumber
      address
      city
      county
      isVatPayer
      bankName
      iban
      isDefault
    }
  }
`;

export const UPSERT_BILLING_PROFILE = gql`
  mutation UpsertBillingProfile($input: BillingProfileInput!) {
    upsertBillingProfile(input: $input) {
      id
      isCompany
      companyName
      cui
      regNumber
      address
      city
      county
      isVatPayer
      bankName
      iban
    }
  }
`;

export const MY_INVOICES = gql`
  query MyInvoices($first: Int, $after: String) {
    myInvoices(first: $first, after: $after) {
      edges {
        id
        invoiceType
        invoiceNumber
        status
        sellerCompanyName
        buyerName
        subtotalAmount
        vatRate
        vatAmount
        totalAmount
        currency
        downloadUrl
        issuedAt
        createdAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const INVOICE_DETAIL = gql`
  query InvoiceDetail($id: ID!) {
    invoiceDetail(id: $id) {
      id
      invoiceType
      invoiceNumber
      status
      sellerCompanyName
      sellerCui
      buyerName
      buyerCui
      subtotalAmount
      vatRate
      vatAmount
      totalAmount
      currency
      efacturaStatus
      downloadUrl
      issuedAt
      dueDate
      notes
      lineItems {
        id
        descriptionRo
        quantity
        unitPrice
        vatRate
        vatAmount
        lineTotal
        lineTotalWithVat
      }
      booking {
        id
        referenceCode
        serviceName
      }
      company {
        id
        companyName
      }
      createdAt
    }
  }
`;

export const CLIENT_INVOICE_FOR_BOOKING = gql`
  query ClientInvoiceForBooking($bookingId: ID!) {
    clientInvoiceForBooking(bookingId: $bookingId) {
      id
      invoiceNumber
      status
      totalAmount
      currency
      downloadUrl
      issuedAt
      sellerCompanyName
    }
  }
`;

// ─── Company Invoices ─────────────────────────────────────────────────────

export const COMPANY_RECEIVED_INVOICES = gql`
  query CompanyReceivedInvoices($first: Int, $after: String) {
    companyReceivedInvoices(first: $first, after: $after) {
      edges {
        id
        invoiceType
        invoiceNumber
        status
        sellerCompanyName
        buyerName
        totalAmount
        currency
        downloadUrl
        issuedAt
        createdAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const COMPANY_INVOICES = gql`
  query CompanyInvoices($status: InvoiceStatus, $first: Int, $after: String) {
    companyInvoices(status: $status, first: $first, after: $after) {
      edges {
        id
        invoiceType
        invoiceNumber
        status
        buyerName
        totalAmount
        currency
        efacturaStatus
        downloadUrl
        issuedAt
        createdAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GENERATE_BOOKING_INVOICE = gql`
  mutation GenerateBookingInvoice($bookingId: ID!) {
    generateBookingInvoice(bookingId: $bookingId) {
      id
      invoiceNumber
      status
      totalAmount
      downloadUrl
    }
  }
`;

export const CANCEL_INVOICE = gql`
  mutation CancelInvoice($id: ID!) {
    cancelInvoice(id: $id) {
      id
      status
    }
  }
`;

export const MARK_INVOICE_AS_PAID = gql`
  mutation MarkInvoiceAsPaid($id: ID!) {
    markInvoiceAsPaid(id: $id) {
      id
      status
    }
  }
`;

export const TRANSMIT_TO_EFACTURA = gql`
  mutation TransmitInvoiceToEFactura($id: ID!) {
    transmitInvoiceToEFactura(id: $id) {
      id
      efacturaStatus
    }
  }
`;

// ─── Admin Payments ───────────────────────────────────────────────────────

export const ALL_PAYMENT_TRANSACTIONS = gql`
  query AllPaymentTransactions($status: PaymentTransactionStatus, $first: Int, $after: String) {
    allPaymentTransactions(status: $status, first: $first, after: $after) {
      id
      bookingId
      stripePaymentIntentId
      amountTotal
      amountCompany
      amountPlatformFee
      currency
      status
      failureReason
      refundAmount
      createdAt
      booking {
        id
        referenceCode
        serviceName
        company {
          id
          companyName
        }
      }
    }
  }
`;

export const ALL_REFUND_REQUESTS = gql`
  query AllRefundRequests($status: RefundStatus, $first: Int, $after: String) {
    allRefundRequests(status: $status, first: $first, after: $after) {
      id
      amount
      reason
      status
      processedAt
      createdAt
      booking {
        id
        referenceCode
        serviceName
      }
      requestedBy {
        id
        fullName
        email
      }
      approvedBy {
        id
        fullName
      }
    }
  }
`;

export const PROCESS_REFUND = gql`
  mutation ProcessRefund($refundRequestId: ID!, $approved: Boolean!) {
    processRefund(refundRequestId: $refundRequestId, approved: $approved) {
      id
      status
      processedAt
    }
  }
`;

export const ADMIN_ISSUE_REFUND = gql`
  mutation AdminIssueRefund($bookingId: ID!, $amount: Int!, $reason: String!) {
    adminIssueRefund(bookingId: $bookingId, amount: $amount, reason: $reason) {
      id
      amount
      reason
      status
    }
  }
`;

export const CREATE_MONTHLY_PAYOUT = gql`
  mutation CreateMonthlyPayout($companyId: ID!, $periodFrom: String!, $periodTo: String!) {
    createMonthlyPayout(companyId: $companyId, periodFrom: $periodFrom, periodTo: $periodTo) {
      id
      amount
      bookingCount
      status
      company {
        id
        companyName
      }
    }
  }
`;

export const ALL_PAYOUTS = gql`
  query AllPayouts($companyId: ID, $status: PayoutStatus, $first: Int, $after: String) {
    allPayouts(companyId: $companyId, status: $status, first: $first, after: $after) {
      id
      amount
      currency
      periodFrom
      periodTo
      bookingCount
      status
      paidAt
      createdAt
      company {
        id
        companyName
      }
    }
  }
`;

export const UPDATE_PAYOUT_STATUS = gql`
  mutation UpdatePayoutStatus($payoutId: ID!, $status: PayoutStatus!, $notes: String) {
    updatePayoutStatus(payoutId: $payoutId, status: $status, notes: $notes) {
      id
      status
      paidAt
    }
  }
`;

export const PLATFORM_REVENUE_REPORT = gql`
  query PlatformRevenueReport($from: String!, $to: String!) {
    platformRevenueReport(from: $from, to: $to) {
      totalRevenue
      totalCommission
      totalPayouts
      pendingPayouts
      totalRefunds
      netRevenue
      bookingCount
    }
  }
`;

export const MARK_BOOKING_PAID = gql`
  mutation MarkBookingPaid($id: ID!) {
    markBookingPaid(id: $id) {
      id
      paymentStatus
    }
  }
`;

// ─── Admin Invoices ───────────────────────────────────────────────────────

export const ALL_INVOICES = gql`
  query AllInvoices($type: InvoiceType, $status: InvoiceStatus, $companyId: ID, $first: Int, $after: String) {
    allInvoices(type: $type, status: $status, companyId: $companyId, first: $first, after: $after) {
      edges {
        id
        invoiceType
        invoiceNumber
        status
        sellerCompanyName
        buyerName
        totalAmount
        currency
        efacturaStatus
        downloadUrl
        issuedAt
        createdAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GENERATE_COMMISSION_INVOICE = gql`
  mutation GenerateCommissionInvoice($payoutId: ID!) {
    generateCommissionInvoice(payoutId: $payoutId) {
      id
      invoiceNumber
      status
      totalAmount
    }
  }
`;

export const GENERATE_CREDIT_NOTE = gql`
  mutation GenerateCreditNote($invoiceId: ID!, $amount: Int!, $reason: String!) {
    generateCreditNote(invoiceId: $invoiceId, amount: $amount, reason: $reason) {
      id
      invoiceNumber
      status
      totalAmount
    }
  }
`;

export const REFRESH_EFACTURA_STATUS = gql`
  mutation RefreshEFacturaStatus($id: ID!) {
    refreshEFacturaStatus(id: $id) {
      id
      invoiceNumber
      status
      efacturaStatus
    }
  }
`;

export const INVOICE_ANALYTICS = gql`
  query InvoiceAnalytics($from: String!, $to: String!) {
    invoiceAnalytics(from: $from, to: $to) {
      totalIssued
      totalAmount
      totalVat
      byStatus {
        status
        count
        totalAmount
      }
      byType {
        type
        count
        totalAmount
      }
    }
  }
`;

// ─── Company Documents ────────────────────────────────────────────────────────

export const COMPANY_DOCUMENTS = gql`
  query CompanyDocuments($companyId: ID!) {
    company(id: $companyId) {
      id
      documents {
        id
        documentType
        fileUrl
        fileName
        status
        uploadedAt
        reviewedAt
        rejectionReason
      }
    }
  }
`;

export const MY_COMPANY_DOCUMENTS = gql`
  query MyCompanyDocuments {
    myCompany {
      id
      documents {
        id
        documentType
        fileUrl
        fileName
        status
        uploadedAt
        reviewedAt
        rejectionReason
      }
    }
  }
`;

export const UPLOAD_COMPANY_DOCUMENT = gql`
  mutation UploadCompanyDocument($companyId: ID!, $documentType: String!, $file: Upload!) {
    uploadCompanyDocument(companyId: $companyId, documentType: $documentType, file: $file) {
      id
      documentType
      fileUrl
      fileName
      status
      uploadedAt
    }
  }
`;

export const DELETE_COMPANY_DOCUMENT = gql`
  mutation DeleteCompanyDocument($id: ID!) {
    deleteCompanyDocument(id: $id)
  }
`;

export const REVIEW_COMPANY_DOCUMENT = gql`
  mutation ReviewCompanyDocument($id: ID!, $approved: Boolean!, $rejectionReason: String) {
    reviewCompanyDocument(id: $id, approved: $approved, rejectionReason: $rejectionReason) {
      id
      status
      reviewedAt
      rejectionReason
    }
  }
`;

export const PENDING_COMPANY_DOCUMENTS = gql`
  query PendingCompanyDocuments {
    pendingCompanyDocuments {
      id
      documentType
      fileUrl
      fileName
      status
      uploadedAt
    }
  }
`;

// ─── Worker Documents ─────────────────────────────────────────────────────────

export const WORKER_DOCUMENTS = gql`
  query WorkerDocuments($workerId: ID!) {
    workerDocuments(workerId: $workerId) {
      id
      documentType
      fileUrl
      fileName
      status
      uploadedAt
      reviewedAt
      rejectionReason
    }
  }
`;

export const MY_WORKER_DOCUMENTS = gql`
  query MyWorkerDocuments {
    myWorkerProfile {
      id
      documents {
        id
        documentType
        fileUrl
        fileName
        status
        uploadedAt
        reviewedAt
        rejectionReason
      }
    }
  }
`;

export const UPLOAD_WORKER_DOCUMENT = gql`
  mutation UploadWorkerDocument($workerId: ID!, $documentType: String!, $file: Upload!) {
    uploadWorkerDocument(workerId: $workerId, documentType: $documentType, file: $file) {
      id
      documentType
      fileUrl
      fileName
      status
      uploadedAt
    }
  }
`;

export const DELETE_WORKER_DOCUMENT = gql`
  mutation DeleteWorkerDocument($id: ID!) {
    deleteWorkerDocument(id: $id)
  }
`;

export const REVIEW_WORKER_DOCUMENT = gql`
  mutation ReviewWorkerDocument($id: ID!, $approved: Boolean!, $rejectionReason: String) {
    reviewWorkerDocument(id: $id, approved: $approved, rejectionReason: $rejectionReason) {
      id
      status
      reviewedAt
      rejectionReason
    }
  }
`;

export const PENDING_WORKER_DOCUMENTS = gql`
  query PendingWorkerDocuments {
    pendingWorkerDocuments {
      id
      documentType
      fileUrl
      fileName
      status
      uploadedAt
    }
  }
`;

export const ACTIVATE_WORKER = gql`
  mutation ActivateWorker($id: ID!) {
    activateWorker(id: $id) {
      id
      status
    }
  }
`;

// ─── Personality Assessment ──────────────────────────────────────────────────

export const PERSONALITY_QUESTIONS = gql`
  query PersonalityQuestions {
    personalityQuestions {
      number
      facetCode
      text
    }
  }
`;

export const MY_PERSONALITY_ASSESSMENT = gql`
  query MyPersonalityAssessment {
    myPersonalityAssessment {
      id
      facetScores {
        facetCode
        facetName
        score
        maxScore
        isFlagged
      }
      integrityAvg
      workQualityAvg
      hasConcerns
      flaggedFacets
      completedAt
    }
  }
`;

export const WORKER_PERSONALITY_ASSESSMENT = gql`
  query WorkerPersonalityAssessment($workerId: ID!) {
    workerPersonalityAssessment(workerId: $workerId) {
      id
      facetScores {
        facetCode
        facetName
        score
        maxScore
        isFlagged
      }
      integrityAvg
      workQualityAvg
      hasConcerns
      flaggedFacets
      completedAt
    }
  }
`;

export const SUBMIT_PERSONALITY_ASSESSMENT = gql`
  mutation SubmitPersonalityAssessment($answers: [PersonalityAnswerInput!]!) {
    submitPersonalityAssessment(answers: $answers) {
      id
      facetScores {
        facetCode
        facetName
        score
        maxScore
        isFlagged
      }
      integrityAvg
      workQualityAvg
      hasConcerns
      flaggedFacets
      completedAt
    }
  }
`;

export const GENERATE_PERSONALITY_INSIGHTS = gql`
  mutation GeneratePersonalityInsights($workerId: ID!) {
    generatePersonalityInsights(workerId: $workerId) {
      summary
      strengths
      concerns
      teamFitAnalysis
      recommendedAction
      confidence
      aiModel
      generatedAt
    }
  }
`;

// ========================================
// Avatar/Logo Upload Mutations
// ========================================

export const UPLOAD_AVATAR = gql`
  mutation UploadAvatar($file: Upload!) {
    uploadAvatar(file: $file) {
      id
      avatarUrl
      fullName
      email
    }
  }
`;

export const DELETE_MY_ACCOUNT = gql`
  mutation DeleteMyAccount {
    deleteMyAccount
  }
`;

export const UPLOAD_COMPANY_LOGO = gql`
  mutation UploadCompanyLogo($file: Upload!) {
    uploadCompanyLogo(file: $file) {
      id
      logoUrl
      companyName
    }
  }
`;

export const UPLOAD_WORKER_AVATAR = gql`
  mutation UploadWorkerAvatar($workerId: ID!, $file: Upload!) {
    uploadWorkerAvatar(workerId: $workerId, file: $file) {
      id
      user {
        id
        avatarUrl
      }
      fullName
    }
  }
`;

// ─── Platform & Waitlist ─────────────────────────────────────────────────────

export const PLATFORM_MODE = gql`
  query PlatformMode {
    platformMode
  }
`;

export const WAITLIST_STATS = gql`
  query WaitlistStats {
    waitlistStats {
      clientCount
      companyCount
      totalCount
    }
  }
`;

export const WAITLIST_LEADS = gql`
  query WaitlistLeads($leadType: WaitlistLeadType, $limit: Int, $offset: Int) {
    waitlistLeads(leadType: $leadType, limit: $limit, offset: $offset) {
      id
      leadType
      name
      email
      phone
      city
      companyName
      message
      createdAt
    }
  }
`;

export const JOIN_WAITLIST = gql`
  mutation JoinWaitlist($input: JoinWaitlistInput!) {
    joinWaitlist(input: $input) {
      id
      email
      leadType
      name
      createdAt
    }
  }
`;

export const GET_DOCUMENT_URL = gql`
  query GetDocumentUrl($documentId: ID!) {
    getDocumentUrl(documentId: $documentId)
  }
`;

// ─── Service Categories ─────────────────────────────────────────────────────

export const SERVICE_CATEGORIES = gql`
  query ServiceCategories {
    serviceCategories {
      id
      slug
      nameRo
      nameEn
      icon
      isActive
    }
  }
`;

export const UPDATE_WORKER_SERVICE_CATEGORIES = gql`
  mutation UpdateWorkerServiceCategories($workerId: ID!, $categoryIds: [ID!]!) {
    updateWorkerServiceCategories(workerId: $workerId, categoryIds: $categoryIds) {
      id
      slug
      nameRo
      nameEn
      icon
    }
  }
`;

export const UPDATE_COMPANY_SERVICE_CATEGORIES = gql`
  mutation UpdateCompanyServiceCategories($categoryIds: [ID!]!) {
    updateCompanyServiceCategories(categoryIds: $categoryIds) {
      id
      slug
      nameRo
      nameEn
      icon
    }
  }
`;

export const ALL_SERVICE_CATEGORIES = gql`
  query AllServiceCategories {
    allServiceCategories {
      id
      slug
      nameRo
      nameEn
      descriptionRo
      descriptionEn
      icon
      imageUrl
      commissionPct
      sortOrder
      isActive
      formFields
      services {
        id
        nameRo
      }
    }
  }
`;

export const SERVICE_CATEGORY_BY_SLUG = gql`
  query ServiceCategoryBySlug($slug: String!) {
    serviceCategoryBySlug(slug: $slug) {
      id
      slug
      nameRo
      nameEn
      descriptionRo
      descriptionEn
      icon
      imageUrl
      isActive
      formFields
      services {
        id
        serviceType
        nameRo
        nameEn
        descriptionRo
        descriptionEn
        basePricePerHour
        minHours
        icon
        isActive
        pricingModel
        pricePerSqm
      }
    }
  }
`;

export const CREATE_SERVICE_CATEGORY = gql`
  mutation CreateServiceCategory($input: CreateServiceCategoryInput!) {
    createServiceCategory(input: $input) {
      id
      slug
      nameRo
      nameEn
      commissionPct
      sortOrder
      isActive
      formFields
    }
  }
`;

export const UPDATE_SERVICE_CATEGORY = gql`
  mutation UpdateServiceCategory($input: UpdateServiceCategoryInput!) {
    updateServiceCategory(input: $input) {
      id
      slug
      nameRo
      nameEn
      commissionPct
      sortOrder
      isActive
      formFields
    }
  }
`;

// ─── Price Audit Log ────────────────────────────────────────────────────────

export const PRICE_AUDIT_LOG = gql`
  query PriceAuditLog($entityType: String, $limit: Int, $offset: Int) {
    priceAuditLog(entityType: $entityType, limit: $limit, offset: $offset) {
      entries {
        id
        entityType
        entityId
        fieldName
        oldValue
        newValue
        changedByName
        changedByEmail
        changedAt
      }
      totalCount
    }
  }
`;

// ─── Contact ─────────────────────────────────────────────────────────────────

export const SEND_CONTACT_MESSAGE = gql`
  mutation SendContactMessage($input: ContactMessageInput!) {
    sendContactMessage(input: $input)
  }
`;

// ─── City Pricing ───────────────────────────────────────────────────────────

export const UPDATE_CITY_PRICING_MULTIPLIER = gql`
  mutation UpdateCityPricingMultiplier($id: ID!, $pricingMultiplier: Float!) {
    updateCityPricingMultiplier(id: $id, pricingMultiplier: $pricingMultiplier) {
      id
      pricingMultiplier
    }
  }
`;

// ─── Notifications ────────────────────────────────────────────────────────────

export const UNREAD_NOTIFICATION_COUNT = gql`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const MY_NOTIFICATIONS = gql`
  query MyNotifications($first: Int, $after: String, $unreadOnly: Boolean) {
    myNotifications(first: $first, after: $after, unreadOnly: $unreadOnly) {
      edges {
        id
        type
        title
        body
        data
        isRead
        createdAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

// ─── Phone Verification ───────────────────────────────────────────────────────

export const REQUEST_PHONE_VERIFICATION = gql`
  mutation RequestPhoneVerification($phone: String!) {
    requestPhoneVerification(phone: $phone)
  }
`;

export const VERIFY_PHONE = gql`
  mutation VerifyPhone($phone: String!, $code: String!) {
    verifyPhone(phone: $phone, code: $code) {
      id
      phone
      phoneVerified
    }
  }
`;

// ─── Referral ─────────────────────────────────────────────────────────────────

export const MY_REFERRAL_STATUS = gql`
  query MyReferralStatus {
    myReferralStatus {
      code
      shareUrl
      currentProgress {
        joinedCount
        completedCount
        requiredCount
      }
      availableDiscounts
      discounts {
        id
        status
        earnedAt
        expiresAt
      }
    }
  }
`;

export const APPLY_REFERRAL_DISCOUNT = gql`
  mutation ApplyReferralDiscountToBooking($bookingId: ID!) {
    applyReferralDiscountToBooking(bookingId: $bookingId) {
      id
      platformCommissionPct
      estimatedTotal
      referralDiscountId
    }
  }
`;
