package com.reservio.service.specification;

import com.reservio.entity.Reservation;
import com.reservio.enums.ReservationStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class ReservationSpecification {

    private static final String RESERVATION_DATE = "reservationDate";
    private static final String BUSINESS = "business";
    private static final String USER = "user";
    private static final String USERNAME = "username";
    private static final String NAME = "name";
    private static final String TITLE = "title";
    private static final String ID = "id";
    private static final String REMARK = "remark";
    private static final String STATUS = "status";

    private ReservationSpecification() {}

    public static Specification<Reservation> businessIs(Long businessId) {
        return (root, query, criteriaBuilder) -> {
            if (businessId == null) return null;
            return criteriaBuilder.equal(root.get(BUSINESS).get(ID), businessId);
        };
    }

    public static Specification<Reservation> customerIs(Long customerId) {
        return (root, query, criteriaBuilder) -> {
            if (customerId == null) return null;
            return criteriaBuilder.equal(root.get(USER).get(ID), customerId);
        };
    }

    public static Specification<Reservation> dateBetween(LocalDate startDate, LocalDate endDate){
        return (root, query, criteriaBuilder) -> {
            if (startDate == null && endDate == null) return null;
            return criteriaBuilder.between(root.get(RESERVATION_DATE), startDate, endDate);
        };
    }

    public static Specification<Reservation> dateBefore(LocalDate endDate){
        return (root, query, criteriaBuilder) -> {
            if (endDate == null) return null;
            return criteriaBuilder.lessThanOrEqualTo(root.get(RESERVATION_DATE), endDate);
        };
    }

    public static Specification<Reservation> dateAfter(LocalDate startDate){
        return (root, query, criteriaBuilder) -> {
            if (startDate == null) return null;
            return criteriaBuilder.greaterThanOrEqualTo(root.get(RESERVATION_DATE), startDate);
        };
    }

    public static Specification<Reservation> serviceIs(String service) {
        return (root, query, criteriaBuilder) -> {
            if (service == null) return null;
            return criteriaBuilder.equal(root.get(TITLE), service);
        };
    }

    public static Specification<Reservation> serviceLike(String service) {
        return (root, query, criteriaBuilder) -> {
            if (service == null) return null;
            return criteriaBuilder.like(root.get(TITLE), "%" + service + "%");
        };
    }

    public static Specification<Reservation> keywordLikeForBusiness(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null) return null;
            return customerNameLike(keyword)
                    .or(remarkLike(keyword))
                    .toPredicate(root, query, criteriaBuilder);
        };
    }

    public static Specification<Reservation> keywordLikeForCustomer(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null) return null;
            return businessNameLike(keyword)
                    .or(serviceLike(keyword))
                    .or(remarkLike(keyword))
                    .toPredicate(root, query, criteriaBuilder);
        };
    }

    public static Specification<Reservation> statusIs(ReservationStatus status) {
        return (root, query, criteriaBuilder) -> {
            if (status == null) return null;
            return criteriaBuilder.equal(root.get(STATUS), status);
        };
    }

    private static Specification<Reservation> customerNameLike(String customerName) {
        return (root, query, criteriaBuilder) -> {
            if (customerName == null) return null;
            String pattern = "%" + customerName + "%";
            return criteriaBuilder.or(
                    criteriaBuilder.like(root.get("customerName"), pattern),
                    criteriaBuilder.like(root.get(USER).get(USERNAME), pattern)
            );
        };
    }

    private static Specification<Reservation> businessNameLike(String businessName) {
        return (root, query, criteriaBuilder) -> {
            if (businessName == null) return null;
            return criteriaBuilder.like(root.get(BUSINESS).get(NAME), "%" + businessName + "%");
        };
    }

    private static Specification<Reservation> remarkLike(String remark) {
        return (root, query, criteriaBuilder) -> {
            if (remark == null) return null;
            return criteriaBuilder.like(root.get(REMARK), "%" + remark + "%");
        };
    }
}
