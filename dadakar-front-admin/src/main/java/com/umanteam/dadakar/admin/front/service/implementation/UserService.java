package com.umanteam.dadakar.admin.front.service.implementation;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.umanteam.dadakar.admin.front.dto.Complaint;
import com.umanteam.dadakar.admin.front.dto.Rating;
import com.umanteam.dadakar.admin.front.dto.User;
import com.umanteam.dadakar.admin.front.service.interfaces.IUserService;

@Service
public class UserService implements IUserService {
	
	@Autowired
	private RestTemplate restTemplate;
	
	@Value("${user.path}")
	private String userPath;
	
	@Value("${rating.base}")
	private int ratingBase;
	
	@Value("${rating.minacceptable}")
	private int ratingMinAcceptable;
	
	@Override
	public List<User> findAll() {
		ResponseEntity<List<User>> usersResponse = restTemplate.exchange(userPath, HttpMethod.GET, null, new ParameterizedTypeReference<List<User>>() {});
		List<User> users = usersResponse.getBody();
		return users;
	}
	
	@Override
	public User findById(String id) {
		ResponseEntity<User> userResponse = restTemplate.getForEntity(userPath + "/" + id, User.class);
		User user = userResponse.getBody();
		return user;
	}
	
	@Override
	public User findByAccountUsername(String username) {
		ResponseEntity<User> userResponse = restTemplate.getForEntity(userPath + "/username:" + username, User.class);
		User user = userResponse.getBody();
		return user;
	}
	
	@Override
	public User update(User user) {
		HttpEntity<User> userRequest = new HttpEntity<>(user);
		ResponseEntity<User> userResponse = restTemplate.exchange(userPath + "/update", HttpMethod.PUT, userRequest, User.class);
		user = userResponse.getBody();
		return user;
	}
	
	@Override
	public List<Complaint> getComplaint() {
		List<Complaint> complaints = new ArrayList<>();
		List<User> users = findAll();
		for(User user: users) {
			int counter = 0;
			int nbRatings = user.getRatings().size();
			if(nbRatings > ratingBase) for(Rating rating: user.getRatings()) if(rating.getValue() < ratingMinAcceptable) counter++;
			double ratio = counter / nbRatings;
			if(ratio > 0.5) complaints.add(new Complaint(user, nbRatings, ratio));
		}
		return complaints;
	}

}