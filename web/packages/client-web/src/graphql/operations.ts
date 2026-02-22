import { gql } from '@apollo/client';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const SIGN_IN_WITH_GOOGLE = gql`
  mutation SignInWithGoogle($idToken: String!, $role: UserRole!) {
    signInWithGoogle(idToken: $idToken, role: $role) {
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
  mutation VerifyEmailOtp($email: String!, $code: String!, $role: UserRole!) {
    verifyEmailOtp(email: $email, code: $code, role: $role) {
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
        occurrenceNumber
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
      occurrenceNumber
      createdAt
      address {
        streetAddress
        city
        county
        floor
        apartment
      }
      company {
        id
        companyName
        contactPhone
      }
      client {
        id
        fullName
        email
        phone
      }
      cleaner {
        id
        fullName
        phone
      }
      timeSlots {
        id
        slotDate
        startTime
        endTime
        isSelected
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
        comment
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
      comment
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
      preferredCleaner {
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
      preferredCleaner {
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
        cleaner {
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

// ─── Chat ────────────────────────────────────────────────────────────────────

export const MY_CHAT_ROOMS = gql`
  query MyChatRooms {
    myChatRooms {
      id
      roomType
      lastMessage {
        id
        content
        messageType
        isRead
        createdAt
        sender { id fullName }
      }
      participants {
        user { id fullName avatarUrl }
        joinedAt
      }
      createdAt
    }
  }
`;

export const CHAT_ROOM_DETAIL = gql`
  query ChatRoomDetail($id: ID!) {
    chatRoom(id: $id) {
      id
      roomType
      participants {
        user { id fullName avatarUrl role }
        joinedAt
      }
      messages {
        edges {
          id
          content
          messageType
          isRead
          createdAt
          sender { id fullName avatarUrl }
        }
      }
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($roomId: ID!, $content: String!) {
    sendMessage(roomId: $roomId, content: $content) {
      id
      content
      messageType
      isRead
      createdAt
      sender { id fullName }
    }
  }
`;

export const OPEN_BOOKING_CHAT = gql`
  mutation OpenBookingChat($bookingId: ID!) {
    openBookingChat(bookingId: $bookingId) {
      id
      roomType
    }
  }
`;

export const MARK_MESSAGES_READ = gql`
  mutation MarkMessagesRead($roomId: ID!) {
    markMessagesAsRead(roomId: $roomId)
  }
`;

export const MESSAGE_SENT_SUBSCRIPTION = gql`
  subscription MessageSent($roomId: ID!) {
    messageSent(roomId: $roomId) {
      id
      content
      messageType
      isRead
      createdAt
      sender { id fullName }
    }
  }
`;

export const ALL_CHAT_ROOMS = gql`
  query AllChatRooms {
    allChatRooms {
      id
      roomType
      createdAt
      participants {
        user { id fullName avatarUrl }
        joinedAt
      }
      lastMessage {
        id
        content
        messageType
        createdAt
        sender { id fullName }
      }
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

export const CREATE_ADMIN_CHAT_ROOM = gql`
  mutation CreateAdminChatRoom($userIds: [ID!]!) {
    createAdminChatRoom(userIds: $userIds) {
      id
      roomType
    }
  }
`;

export const COMPANY_CHAT_ROOMS = gql`
  query CompanyChatRooms {
    companyChatRooms {
      id
      roomType
      createdAt
      participants {
        user { id fullName avatarUrl }
        joinedAt
      }
      lastMessage {
        id
        content
        messageType
        createdAt
        sender { id fullName }
      }
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
      maxServiceRadiusKm
      ratingAvg
      totalJobsCompleted
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
      maxServiceRadiusKm
    }
  }
`;

// ─── Cleaners ────────────────────────────────────────────────────────────────

export const MY_CLEANERS = gql`
  query MyCleaners {
    myCleaners {
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

export const INVITE_CLEANER = gql`
  mutation InviteCleaner($input: InviteCleanerInput!) {
    inviteCleaner(input: $input) {
      id
      fullName
      email
      status
      inviteToken
    }
  }
`;

export const INVITE_SELF_AS_CLEANER = gql`
  mutation InviteSelfAsCleaner {
    inviteSelfAsCleaner {
      id
      fullName
      status
      isCompanyAdmin
    }
  }
`;

export const UPDATE_CLEANER_STATUS = gql`
  mutation UpdateCleanerStatus($id: ID!, $status: CleanerStatus!) {
    updateCleanerStatus(id: $id, status: $status) {
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
        createdAt
        client {
          id
          fullName
          phone
        }
        cleaner {
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
      occurrenceNumber
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
      cleaner {
        id
        fullName
        phone
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
      totalAmount
      currency
      downloadUrl
      efacturaStatus
      issuedAt
    }
  }
`;

export const ASSIGN_CLEANER = gql`
  mutation AssignCleaner($bookingId: ID!, $cleanerId: ID!) {
    assignCleanerToBooking(bookingId: $bookingId, cleanerId: $cleanerId) {
      id
      status
      cleaner {
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
      totalCleaners
      totalBookings
      totalRevenue
      platformCommissionTotal
      averageRating
      bookingsThisMonth
      revenueThisMonth
      newClientsThisMonth
      newCompaniesThisMonth
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
      createdAt
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
      maxServiceRadiusKm
      ratingAvg
      totalJobsCompleted
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
      cleaners {
        id
        fullName
        email
        phone
        user {
          id
          avatarUrl
        }
        status
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
      recurringGroupId
      occurrenceNumber
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
      cleaner {
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

export const ALL_CLEANERS = gql`
  query AllCleaners {
    allCleaners {
      id
      fullName
      email
      phone
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

export const ADMIN_CANCEL_BOOKING = gql`
  mutation AdminCancelBooking($id: ID!, $reason: String!) {
    adminCancelBooking(id: $id, reason: $reason) {
      id
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

export const GET_USER_WITH_CLEANER = gql`
  query GetUserWithCleaner($id: ID!) {
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

      # Cleaner data (null if not CLEANER role)
      cleanerProfile {
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

// ─── Admin CMS: Bookings Search ─────────────────────────────────────────────

export const SEARCH_BOOKINGS = gql`
  query SearchBookings($query: String, $status: BookingStatus, $limit: Int, $offset: Int) {
    searchBookings(query: $query, status: $status, limit: $limit, offset: $offset) {
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
        recurringGroupId
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
    }
  }
`;

// ─── Admin CMS: Review Moderation ───────────────────────────────────────────

export const ALL_REVIEWS = gql`
  query AllReviews($limit: Int, $offset: Int) {
    allReviews(limit: $limit, offset: $offset) {
      reviews {
        id
        rating
        comment
        reviewType
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
      client {
        id
        fullName
        phone
      }
      cleaner {
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
        recurringGroupId
      }
      totalCount
    }
  }
`;

export const CLEANER_PERFORMANCE = gql`
  query CleanerPerformance($cleanerId: ID!) {
    cleanerPerformance(cleanerId: $cleanerId) {
      cleanerId
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

export const UPDATE_CLEANER_AVAILABILITY = gql`
  mutation UpdateCleanerAvailability($cleanerId: ID!, $slots: [AvailabilitySlotInput!]!) {
    updateCleanerAvailability(cleanerId: $cleanerId, slots: $slots) {
      id
      dayOfWeek
      startTime
      endTime
      isAvailable
    }
  }
`;

export const CLEANER_DATE_OVERRIDES = gql`
  query CleanerDateOverrides($cleanerId: ID!, $from: String!, $to: String!) {
    cleanerDateOverrides(cleanerId: $cleanerId, from: $from, to: $to) {
      id
      date
      isAvailable
      startTime
      endTime
    }
  }
`;

export const SET_CLEANER_DATE_OVERRIDE_BY_ADMIN = gql`
  mutation SetCleanerDateOverrideByAdmin($cleanerId: ID!, $date: String!, $isAvailable: Boolean!, $startTime: String!, $endTime: String!) {
    setCleanerDateOverrideByAdmin(cleanerId: $cleanerId, date: $date, isAvailable: $isAvailable, startTime: $startTime, endTime: $endTime) {
      id
      date
      isAvailable
      startTime
      endTime
    }
  }
`;

// ─── Cleaner ──────────────────────────────────────────────────────────────────

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

export const MY_CLEANER_PROFILE = gql`
  query MyCleanerProfile {
    myCleanerProfile {
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
    }
  }
`;

export const MY_CLEANER_STATS = gql`
  query MyCleanerStats {
    myCleanerStats {
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

export const CLEANER_EARNINGS_BY_DATE_RANGE = gql`
  query CleanerEarningsByDateRange($from: String!, $to: String!) {
    cleanerEarningsByDateRange(from: $from, to: $to) {
      date
      amount
    }
  }
`;

export const SEARCH_CLEANER_BOOKINGS = gql`
  query SearchCleanerBookings($query: String, $status: String, $dateFrom: String, $dateTo: String, $limit: Int, $offset: Int) {
    searchCleanerBookings(query: $query, status: $status, dateFrom: $dateFrom, dateTo: $dateTo, limit: $limit, offset: $offset) {
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
        recurringGroupId
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

export const MY_CLEANER_AVAILABILITY = gql`
  query MyCleanerAvailability {
    myCleanerAvailability {
      id
      dayOfWeek
      startTime
      endTime
      isAvailable
    }
  }
`;

export const MY_CLEANER_BOOKINGS_BY_DATE_RANGE = gql`
  query MyCleanerBookingsByDateRange($from: String!, $to: String!) {
    myCleanerBookingsByDateRange(from: $from, to: $to) {
      id
      referenceCode
      serviceType
      serviceName
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      status
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

export const MY_CLEANER_REVIEWS = gql`
  query MyCleanerReviews($limit: Int, $offset: Int) {
    myCleanerReviews(limit: $limit, offset: $offset) {
      reviews {
        id
        rating
        comment
        reviewType
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

export const MY_CLEANER_COMPANY_SCHEDULE = gql`
  query MyCleanerCompanySchedule {
    myCleanerCompanySchedule {
      id
      dayOfWeek
      startTime
      endTime
      isWorkDay
    }
  }
`;

export const MY_CLEANER_DATE_OVERRIDES = gql`
  query MyCleanerDateOverrides($from: String!, $to: String!) {
    myCleanerDateOverrides(from: $from, to: $to) {
      id
      date
      isAvailable
      startTime
      endTime
    }
  }
`;

export const SET_CLEANER_DATE_OVERRIDE = gql`
  mutation SetCleanerDateOverride($date: String!, $isAvailable: Boolean!, $startTime: String!, $endTime: String!) {
    setCleanerDateOverride(date: $date, isAvailable: $isAvailable, startTime: $startTime, endTime: $endTime) {
      id
      date
      isAvailable
      startTime
      endTime
    }
  }
`;

export const UPDATE_CLEANER_PROFILE = gql`
  mutation UpdateCleanerProfile($input: UpdateCleanerProfileInput!) {
    updateCleanerProfile(input: $input) {
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

export const SUGGEST_CLEANERS = gql`
  query SuggestCleaners($cityId: ID!, $areaId: ID!, $timeSlots: [TimeSlotInput!]!, $estimatedDurationHours: Float!) {
    suggestCleaners(cityId: $cityId, areaId: $areaId, timeSlots: $timeSlots, estimatedDurationHours: $estimatedDurationHours) {
      cleaner {
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

export const CLEANER_SERVICE_AREAS = gql`
  query CleanerServiceAreas($cleanerId: ID!) {
    cleanerServiceAreas(cleanerId: $cleanerId) {
      id
      name
      cityId
      cityName
    }
  }
`;

export const MY_CLEANER_SERVICE_AREAS = gql`
  query MyCleanerServiceAreas {
    myCleanerServiceAreas {
      id
      name
      cityId
      cityName
    }
  }
`;

export const UPDATE_CLEANER_SERVICE_AREAS = gql`
  mutation UpdateCleanerServiceAreas($cleanerId: ID!, $areaIds: [ID!]!) {
    updateCleanerServiceAreas(cleanerId: $cleanerId, areaIds: $areaIds) {
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

export const MY_PAYMENT_HISTORY = gql`
  query MyPaymentHistory($first: Int, $after: String) {
    myPaymentHistory(first: $first, after: $after) {
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
        endCursor
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

// ─── Company Invoices ─────────────────────────────────────────────────────

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

// ─── Cleaner Documents ────────────────────────────────────────────────────────

export const CLEANER_DOCUMENTS = gql`
  query CleanerDocuments($cleanerId: ID!) {
    cleanerDocuments(cleanerId: $cleanerId) {
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

export const MY_CLEANER_DOCUMENTS = gql`
  query MyCleanerDocuments {
    myCleanerProfile {
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

export const UPLOAD_CLEANER_DOCUMENT = gql`
  mutation UploadCleanerDocument($cleanerId: ID!, $documentType: String!, $file: Upload!) {
    uploadCleanerDocument(cleanerId: $cleanerId, documentType: $documentType, file: $file) {
      id
      documentType
      fileUrl
      fileName
      status
      uploadedAt
    }
  }
`;

export const DELETE_CLEANER_DOCUMENT = gql`
  mutation DeleteCleanerDocument($id: ID!) {
    deleteCleanerDocument(id: $id)
  }
`;

export const REVIEW_CLEANER_DOCUMENT = gql`
  mutation ReviewCleanerDocument($id: ID!, $approved: Boolean!, $rejectionReason: String) {
    reviewCleanerDocument(id: $id, approved: $approved, rejectionReason: $rejectionReason) {
      id
      status
      reviewedAt
      rejectionReason
    }
  }
`;

export const PENDING_CLEANER_DOCUMENTS = gql`
  query PendingCleanerDocuments {
    pendingCleanerDocuments {
      id
      documentType
      fileUrl
      fileName
      status
      uploadedAt
    }
  }
`;

export const ACTIVATE_CLEANER = gql`
  mutation ActivateCleaner($id: ID!) {
    activateCleaner(id: $id) {
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

export const CLEANER_PERSONALITY_ASSESSMENT = gql`
  query CleanerPersonalityAssessment($cleanerId: ID!) {
    cleanerPersonalityAssessment(cleanerId: $cleanerId) {
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
  mutation GeneratePersonalityInsights($cleanerId: ID!) {
    generatePersonalityInsights(cleanerId: $cleanerId) {
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

export const UPLOAD_COMPANY_LOGO = gql`
  mutation UploadCompanyLogo($file: Upload!) {
    uploadCompanyLogo(file: $file) {
      id
      logoUrl
      companyName
    }
  }
`;

export const UPLOAD_CLEANER_AVATAR = gql`
  mutation UploadCleanerAvatar($cleanerId: ID!, $file: Upload!) {
    uploadCleanerAvatar(cleanerId: $cleanerId, file: $file) {
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
