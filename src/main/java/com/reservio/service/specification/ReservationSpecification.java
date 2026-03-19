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
    private static final String TITLE = "title";
    private static final String ID = "id";
    private static final String REMARK = "remark";
    private static final String STATUS = "status";

    private ReservationSpecification() {}

    public static Specification<Reservation> businessEqual(Long businessId) {
        return (root, query, criteriaBuilder) -> {
            if (businessId == null) return null;
            return criteriaBuilder.equal(root.get(BUSINESS).get(ID), businessId);
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

    public static Specification<Reservation> serviceEqual(String service) {
        return (root, query, criteriaBuilder) -> {
            if (service == null) return null;
            return criteriaBuilder.equal(root.get(TITLE), service);
        };
    }

    public static Specification<Reservation> customerNameLike(String customerName) {
        return (root, query, criteriaBuilder) -> {
            if (customerName == null) return null;
            return criteriaBuilder.like(root.get(USER).get(USERNAME), "%" + customerName + "%");
        };
    }

    public static Specification<Reservation> remarkLike(String remark) {
        return (root, query, criteriaBuilder) -> {
            if (remark == null) return null;
            return criteriaBuilder.like(root.get(REMARK), "%" + remark + "%");
        };
    }

    public static Specification<Reservation> keywordLike(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null) return null;
            return customerNameLike(keyword)
                    .or(remarkLike(keyword))
                    .toPredicate(root, query, criteriaBuilder);
        };
    }

    public static Specification<Reservation> statusEqual(ReservationStatus status) {
        return (root, query, criteriaBuilder) -> {
            if (status == null) return null;
            return criteriaBuilder.equal(root.get(STATUS), status);
        };
    }
}
